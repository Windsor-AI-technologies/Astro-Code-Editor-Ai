import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceCtx } from "../../../contexts/WorkspaceContext";
import { useTabsCtx } from "../../../contexts/TabsContext";
import PerlOrb from "./PerlOrb";
import "./PerlView.css";

interface PerlMessage {
  id: string;
  role: "user" | "perl";
  text: string;
  timestamp: number;
}

let msgCount = Date.now();
const nextMsgId = () => `msg-${++msgCount}-${Math.random().toString(36).slice(2, 6)}`;

// ── TTS (Edge TTS via Rust — high quality Microsoft voices) ──
async function speak(text: string, onEnd?: () => void) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const audioBase64 = await invoke<string>("perl_tts", { text });

    // Play the audio
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audio.onended = () => onEnd?.();
    audio.onerror = () => onEnd?.();
    audio.play().catch(() => onEnd?.());
  } catch (e) {
    console.error("TTS error:", e);
    onEnd?.();
  }
}

export default function PerlView() {
  const { rootPath } = useWorkspaceCtx();
  const { activeTab, editorRef, tabs } = useTabsCtx();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle");
  const [messages, setMessages] = useState<PerlMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [micBlocked, setMicBlocked] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingVADRef = useRef(false);
  const lastTranscriptionRef = useRef(0); // Cooldown to avoid rate limits
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load voices (some browsers need this)
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () =>
      window.speechSynthesis.getVoices();
  }, []);

  // ── Process transcribed text through LLM and speak response ──
  const isProcessingRef = useRef(false);
  const processWithLLM = useCallback(
    async (userText: string) => {
      // Prevent duplicate calls
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      // Add user message
      const userMsg: PerlMessage = {
        id: `${nextMsgId()}`,
        role: "user",
        text: userText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setStatus("thinking");

      try {
        // Get current file context
        const currentFile = activeTab?.path?.split(/[\\/]/).pop() ?? null;
        // Try editor first, then tab content, then read from disk
        let currentContent =
          editorRef?.current?.getValue?.() ?? activeTab?.content ?? null;

        // If still null but we have a path, read from disk
        if (!currentContent && activeTab?.path) {
          try {
            currentContent = await invoke<string>("read_file", {
              path: activeTab.path,
            });
          } catch {
            /* ignore read errors */
          }
        }

        const openFiles = tabs?.map((t: any) => t.name).join(", ") ?? "";
        const projectName = rootPath?.split(/[\\/]/).pop() ?? "unknown";
        const fullPath = activeTab?.path ?? null;

        // Get user info from localStorage
        let userName = "Usuario";
        let userEmail = "";
        try {
          const user = JSON.parse(localStorage.getItem("astro-user") || "null");
          if (user?.name) userName = user.name;
          if (user?.email) userEmail = user.email;
        } catch {}

        // Build context for LLM
        let systemPrompt = `Eres Perl, un asistente de voz inteligente integrado en AstroIDE. Responde de forma breve y natural, como en una conversación hablada. No uses markdown, código ni formatos especiales — solo texto plano para ser leído en voz alta. Máximo 2-3 oraciones por respuesta a menos que te pidan más detalle. siempre debes de decir señor y debes de demostrar mas interes como jarvis de iron man, te debes de comportar como humano.

HERRAMIENTAS DISPONIBLES:
Puedes ejecutar acciones respondiendo con un JSON en la PRIMERA línea de tu respuesta. Después del JSON escribe tu respuesta hablada normal en la siguiente línea.

Formatos de acción:
{"action":"open_app","target":"nombre_app"}
{"action":"web_search","query":"búsqueda"}
{"action":"open_url","url":"https://..."}
{"action":"switch_mode","target":"ide|agent|design|electronics|data|music|flowchart"}
{"action":"play_song","query":"nombre de la canción"}
{"action":"open_file","path":"ruta/del/archivo"}
{"action":"new_file","name":"nombre.ext"}
{"action":"open_terminal"}
{"action":"open_settings"}

Ejemplos:
- "abre chrome" → {"action":"open_app","target":"chrome"}
Listo señor, abriendo Chrome.
- "busca cómo hacer una API en Rust" → {"action":"web_search","query":"cómo hacer una API en Rust"}
Buscando eso en Google, señor.
- "abre youtube" → {"action":"open_url","url":"https://youtube.com"}
Abriendo YouTube, señor.
- "abre spotify" → {"action":"open_app","target":"spotify"}
Listo señor, abriendo Spotify.
- "ve al modo música" → {"action":"switch_mode","target":"music"}
Cambiando al modo música, señor.
- "pon una canción de Bad Bunny" → {"action":"play_song","query":"Bad Bunny"}
Buscando música de Bad Bunny, señor.
- "cambia al modo electrónica" → {"action":"switch_mode","target":"electronics"}
Listo señor, cambiando a electrónica.
- "abre la terminal" → {"action":"open_terminal"}
Abriendo terminal, señor.
- "ve a configuración" → {"action":"open_settings"}
Abriendo configuración, señor.
- "ve al IDE" → {"action":"switch_mode","target":"ide"}
Volviendo al modo IDE, señor.
- "hola qué tal" → Hola señor, todo bien. ¿En qué le ayudo?

Si pide abrir una página web (YouTube, GitHub, Twitter, Reddit, etc.) usa open_url.
Si pide buscar algo usa web_search.
Si pide abrir una app local (Chrome, Discord, Spotify, VS Code, Terminal, etc.) usa open_app.
Si pide cambiar de modo (ir a música, diseño, electrónica, datos, flowchart, IDE, agente) usa switch_mode.
Si pide poner/reproducir/buscar música usa play_song.
Si pide abrir terminal usa open_terminal.
Si pide abrir settings/configuración usa open_settings.
Si es conversación normal, solo responde sin JSON.`;

        systemPrompt += `\n\nContexto del workspace:`;
        systemPrompt += `\n- Usuario: ${userName}`;
        if (userEmail) systemPrompt += ` (${userEmail})`;
        systemPrompt += `\n- Proyecto: ${projectName}`;
        systemPrompt += `\n- Ruta: ${rootPath ?? "no definida"}`;
        systemPrompt += `\n- Modo actual: Agent (Perl voice assistant activo)`;
        systemPrompt += `\n- Editor: Astro IDE v0.1.0 (Tauri 2 + React + Monaco)`;
        if (currentFile) systemPrompt += `\n- Archivo activo: ${currentFile}`;
        if (fullPath) systemPrompt += `\n- Ruta completa: ${fullPath}`;
        if (openFiles) systemPrompt += `\n- Archivos abiertos: ${openFiles}`;

        systemPrompt += `\n\nSobre Astro IDE (tu entorno):
- Modos disponibles: IDE, Agent, Design, Electronics, Data, Music, Flowchart
- Funciones del IDE: editor Monaco, terminal, git, debugger, explorador de archivos
- Agent: chat con IA + tú (Perl) como asistente de voz
- Design: diseño de interfaces (próximamente)
- Electronics: simulación de circuitos (próximamente)
- Data: base de datos con conexión a Supabase/MySQL/SQL Server
- Music: reproductor con iTunes API
- Flowchart: editor de diagramas con React Flow (flujo, circuitos, ER, JSON)
- Analytics: notebooks tipo Jupyter con Pyodide (Python en WebAssembly)
- Extensiones: marketplace Open VSX

Próximas funciones planeadas:
- Implementación real de git (status, commit, push, pull)
- Extension runtime (cargar/activar extensiones)
- Spotify Web Playback SDK para música completa
- DB real con sqlx en Rust
- Multi-webview cuando Tauri 3 lo soporte

Si el usuario pregunta sobre el editor, sus funciones, o qué puede hacer, usa esta info para responder con conocimiento.`;

        if (currentContent) {
          // Include first 1500 chars of the active file
          const preview = currentContent.slice(0, 1500);
          systemPrompt += `\n\nContenido del archivo activo (${currentFile}):\n${preview}`;
        } else {
          systemPrompt += `\n\nNota: No hay archivo abierto actualmente o el editor no tiene contenido visible.`;
        }

        systemPrompt += `\n\nSi te preguntan sobre el código, el archivo, o el proyecto, usa este contexto para responder con precisión. Puedes referirte a funciones, variables, imports, etc. que veas en el archivo.`;

        const AI_BACKEND = "https://astro-backend.garzaromerojeshuaabiram2019ktv.workers.dev";

        const msgPayload = [
          { role: "system", content: systemPrompt },
          ...messages.slice(-4).map((m) => ({
            role: m.role === "perl" ? "assistant" : "user",
            content: m.text,
          })),
          { role: "user", content: userText },
        ];

        let responseText: string;
        try {
          const res = await fetch(`${AI_BACKEND}/ai/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: msgPayload,
              temperature: 0.0,
              max_tokens: 500,
              provider: "groq",
            }),
          });
          responseText = await res.text();
        } catch {
          throw new Error("Backend not reachable");
        }

        const data = JSON.parse(responseText);
        if (data.error) {
          throw new Error(data.error.message || data.error || "API error");
        }
        const rawReply =
          data.choices?.[0]?.message?.content ?? "No pude procesar eso, señor. Intente de nuevo en unos segundos.";

        // Parse action from response (first line might be JSON)
        let spokenText = rawReply;
        const lines = rawReply.split('\n');
        const firstLine = lines[0].trim();

        if (firstLine.startsWith('{') && firstLine.includes('"action"')) {
          try {
            const action = JSON.parse(firstLine);
            spokenText = lines.slice(1).join('\n').trim() || 'Listo.';

            // Execute the action
            if (action.action === 'open_app' && action.target) {
              await invoke('perl_open_app', { appName: action.target });
            } else if (action.action === 'web_search' && action.query) {
              await invoke('perl_web_search', { query: action.query });
            } else if (action.action === 'open_url' && action.url) {
              await invoke('perl_open_url', { url: action.url });
            } else if (action.action === 'switch_mode' && action.target) {
              window.dispatchEvent(new CustomEvent('astro-action', { detail: { type: 'switch_mode', target: action.target } }));
            } else if (action.action === 'play_song' && action.query) {
              window.dispatchEvent(new CustomEvent('astro-action', { detail: { type: 'play_song', query: action.query } }));
            } else if (action.action === 'open_terminal') {
              window.dispatchEvent(new CustomEvent('astro-action', { detail: { type: 'open_terminal' } }));
            } else if (action.action === 'open_settings') {
              window.dispatchEvent(new CustomEvent('astro-action', { detail: { type: 'open_settings' } }));
            } else if (action.action === 'open_file' && action.path) {
              window.dispatchEvent(new CustomEvent('astro-action', { detail: { type: 'open_file', path: action.path } }));
            } else if (action.action === 'new_file' && action.name) {
              window.dispatchEvent(new CustomEvent('astro-action', { detail: { type: 'new_file', name: action.name } }));
            }
          } catch {
            // If JSON parse fails, treat entire response as spoken text
            spokenText = rawReply;
          }
        }

        // Add Perl response
        const perlMsg: PerlMessage = {
          id: `${nextMsgId()}`,
          role: "perl",
          text: spokenText,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, perlMsg]);

        // Speak the response
        setStatus("speaking");
        setIsSpeaking(true);
        speak(spokenText, () => {
          setIsSpeaking(false);
          isProcessingRef.current = false;
          // Resume listening if mic is active
          if (streamRef.current) {
            setStatus("listening");
            startRecording();
          } else {
            setStatus("idle");
          }
        });
      } catch (e) {
        const errorMsg: PerlMessage = {
          id: `${nextMsgId()}`,
          role: "perl",
          text: `Error: ${e}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setStatus(streamRef.current ? "listening" : "idle");
        isProcessingRef.current = false;
      }
    },
    [messages],
  );

  // ── Transcribe audio with Groq Whisper ──
  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      setStatus("thinking");
      try {
        // Convert blob to base64
        const arrayBuffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        const AI_BACKEND_W = "https://astro-backend.garzaromerojeshuaabiram2019ktv.workers.dev";

        const res = await fetch(`${AI_BACKEND_W}/ai/whisper`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio_base64: base64 }),
        });
        const data = await res.json();
        const transcription = data.text || "";

        if (transcription && transcription.trim().length > 0) {
          await processWithLLM(transcription.trim());
        } else {
          // No speech detected, resume listening
          setStatus("listening");
          startRecording();
        }
      } catch (e) {
        console.error("Transcription error:", e);
        setStatus("listening");
        startRecording();
      }
    },
    [processWithLLM],
  );

  // ── Start recording audio chunks ──
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    audioChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          // Only send if has meaningful audio (> 1KB = not just silence)
          if (audioBlob.size > 1000) {
            transcribeAudio(audioBlob);
          } else {
            setStatus("listening");
            startRecording();
          }
        }
      };

      recorder.start();
    } catch {
      // Fallback mimeType
      const recorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          if (audioBlob.size > 1000) transcribeAudio(audioBlob);
          else {
            setStatus("listening");
            startRecording();
          }
        }
      };
      recorder.start();
    }
  }, [transcribeAudio]);

  // ── Start VAD + listening ──
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicBlocked(false);

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      setStatus("listening");

      // Start recording
      startRecording();

      // Audio level monitoring + VAD
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function monitorAudio() {
        animFrameRef.current = requestAnimationFrame(monitorAudio);
        analyser.getByteFrequencyData(dataArray);

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length) / 255;
        setAudioLevel(rms);

        // VAD: detect speech then silence
        const threshold = 0.12; // Higher threshold to avoid background noise triggers
        if (rms > threshold) {
          isSpeakingVADRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (isSpeakingVADRef.current && !silenceTimerRef.current) {
          // Start silence timer — after 1.5s of silence, stop recording
          silenceTimerRef.current = setTimeout(() => {
            isSpeakingVADRef.current = false;
            silenceTimerRef.current = null;
            // Cooldown: wait at least 3s between transcriptions to avoid 429 rate limits
            const now = Date.now();
            if (now - lastTranscriptionRef.current < 3000) {
              startRecording();
              return;
            }
            lastTranscriptionRef.current = now;
            // Stop recording to trigger transcription
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state === "recording"
            ) {
              mediaRecorderRef.current.stop();
            }
          }, 1500);
        }
      }
      monitorAudio();
    } catch (err) {
      console.error("Mic denied:", err);
      setMicBlocked(true);
      setStatus("idle");
    }
  }, [startRecording]);

  const stopListening = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    window.speechSynthesis.cancel();
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    setStatus("idle");
  }, []);

  // ── Auto-start listening when component mounts ──
  useEffect(() => {
    startListening();
    return () => {
      // Cleanup on unmount
      cancelAnimationFrame(animFrameRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  // ── Text input fallback (when mic is blocked) ──
  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput("");
    await processWithLLM(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "idle":
        return "Activating...";
      case "listening":
        return "Listening...";
      case "thinking":
        return "Thinking...";
      case "speaking":
        return "Speaking...";
    }
  };

  return (
    <div className="perl-view">
      {/* Orb area */}
      <div className="perl-orb-area">
        <PerlOrb
          audioLevel={audioLevel}
          isListening={isListening}
          isSpeaking={isSpeaking}
        />

        {/* Status overlay */}
        <div className="perl-overlay">
          <div className={`perl-status perl-status--${status}`}>
            <div className="perl-status-dot" />
            <span>{getStatusText()}</span>
          </div>

          {/* Mute/unmute button (just a toggle, not required to start) */}
          <button
            className={`perl-activate-btn ${isListening ? "perl-activate-btn--active" : ""}`}
            onClick={toggleListening}
            title={isListening ? "Mute Perl" : "Unmute Perl"}
          >
            {isListening ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                  fill="currentColor"
                />
                <path
                  d="M19 10v2a7 7 0 0 1-14 0v-2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="12"
                  y1="19"
                  x2="12"
                  y2="23"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="8"
                  y1="23"
                  x2="16"
                  y2="23"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                  fill="currentColor"
                  opacity="0.3"
                />
                <line
                  x1="3"
                  y1="3"
                  x2="21"
                  y2="21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>

          {/* Audio level indicator */}
          {isListening && (
            <div className="perl-level-bar">
              <div
                className="perl-level-fill"
                style={{ width: `${Math.min(audioLevel * 200, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Text input fallback when mic is blocked */}
      {(micBlocked || !isListening) && (
        <div className="perl-text-input">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              micBlocked
                ? "Mic blocked — type here instead..."
                : "Or type to Perl..."
            }
            className="perl-input-field"
          />
          <button
            className="perl-send-btn"
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || status === "thinking"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Conversation history */}
      {messages.length > 0 && (
        <div className="perl-conversation">
          <div className="perl-conversation-header">
            <span>Conversation</span>
            <button className="perl-clear-btn" onClick={() => setMessages([])}>
              Clear
            </button>
          </div>
          <div className="perl-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`perl-msg perl-msg--${msg.role}`}>
                <div className="perl-msg-avatar">
                  {msg.role === "user" ? "🎤" : "🔮"}
                </div>
                <div className="perl-msg-content">
                  <span className="perl-msg-role">
                    {msg.role === "user" ? "You" : "Perl"}
                  </span>
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
