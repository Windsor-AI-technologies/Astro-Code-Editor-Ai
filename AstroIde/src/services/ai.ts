import type { AIMessage, AIMode } from "../types/ai_models";

// ── AI Provider Config ────────────────────────────────────────────────────────

export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const PROVIDERS: Record<string, Omit<AIProviderConfig, "apiKey">> = {
  // Cerebras (1M tokens/day free, ultra fast, OpenAI-compatible)
  "cerebras-glm": {
    baseUrl: "https://api.cerebras.ai/v1",
    model: "zai-glm-4.7",
  },
  "cerebras-gemma": {
    baseUrl: "https://api.cerebras.ai/v1",
    model: "gemma-4-31b",
  },
  "cerebras-gpt-oss": {
    baseUrl: "https://api.cerebras.ai/v1",
    model: "openai-gpt-oss-120b",
  },
  // Groq (free tier, OpenAI-compatible)
  "groq-llama3": {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  "groq-deepseek-r1": {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "deepseek-r1-distill-qwen-32b",
  },
  "deepseek-r1": {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-reasoner",
  },
  "deepseek-v3": {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  // OpenAI
  "gpt-4o": {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  "gpt-4o-mini": {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  // Anthropic (via proxy compatible API)
  "claude-4-sonnet": {
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-5",
  },
  // Google
  "gemini-2.5-pro": {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-pro",
  },
  "gemini-2.0-flash": {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
  },
  // Local Ollama
  "local-ollama": {
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
  },
};

// ── API Keys storage ─────────────────────────────────────────────────────────
const sessionKeys: Record<string, string> = {
  groq: "backend",
  cerebras: "backend",
};

export function setApiKey(provider: string, key: string) {
  sessionKeys[provider] = key;
}

export function getApiKey(provider: string): string {
  return sessionKeys[provider] ?? "";
}

export function hasApiKey(modelId: string): boolean {
  const provider = getProviderName(modelId);
  if (provider === "local") return true; // Ollama doesn't need a key
  return !!sessionKeys[provider];
}

// Detecta si el usuario está pidiendo crear/modificar código
const CODE_KEYWORDS = [
  "crea",
  "modifica",
  "agrega",
  "implementa",
  "arregla",
  "fix",
  "add",
  "create",
  "modify",
  "refactor",
  "cambia",
  "escribe",
  "genera",
  "haz",
  "hazme",
  "programa",
  "codigo",
  "función",
  "funcion",
  "componente",
  "class",
  "archivo",
  "lee",
  "leer",
  "leelo",
  "analiza",
  "revisa",
  "review",
  "opina",
  "opinion",
  "parece",
  "mejora",
  "optimiza",
  "explica",
  "explain",
  "que hace",
  "como funciona",
];

function looksLikeCodeRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return CODE_KEYWORDS.some((kw) => lower.includes(kw));
}

function getProviderName(modelId: string): string {
  if (modelId.startsWith("cerebras")) return "cerebras";
  if (modelId.startsWith("groq")) return "groq";
  if (modelId.startsWith("deepseek")) return "deepseek";
  if (modelId.startsWith("gpt")) return "openai";
  if (modelId.startsWith("claude")) return "anthropic";
  if (modelId.startsWith("gemini")) return "google";
  if (modelId === "local-ollama") return "local";
  return modelId;
}

// ── System prompts per mode ───────────────────────────────────────────────────

function getSystemPrompt(
  mode: AIMode,
  _activeFilePath: string | null,
  _fileContent?: string | null,
): string {
  const file = _activeFilePath ? _activeFilePath.split(/[\\/]/).pop() : "";

  // Solo incluir contenido del archivo si es modo engineer y el usuario pide cambios
  // El contenido se inyecta en el mensaje del usuario, no en el system prompt
  const prompts: Record<AIMode, string> = {
    engineer: `Eres un asistente de código en un IDE. Solo responde con código cuando el usuario te pida crear o modificar algo. Si te saluda o hace una pregunta normal, responde normal sin código. Archivo: ${file}`,
    ask: `Asistente de código. Sé breve.`,
    plan: `Arquitecto de software. Da pasos numerados cortos. te enfocaras en el mantenimiento y legibilidad del codigo que el usuario escriba y el que tu escribas o propongas debe ser de calidad priorizando el rendimiento. Solo responde con código cuando el usuario te pida explicitamente crear o modificar algo, si son preguntas respondele normal. Debes ser completamente estrico al momento de proponer el codigo, debe ser suficientemente claro consciso mantenible escalable y sigiendo los principios solid en los proyectos`,
  };
  return prompts[mode];
}

// ── Send message (OpenAI-compatible API) ─────────────────────────────────────

export interface SendOptions {
  modelId: string;
  messages: AIMessage[];
  mode: AIMode;
  activeFilePath: string | null;
  activeFileContent?: string | null;
  onChunk?: (text: string) => void;
}

export async function sendMessage(options: SendOptions): Promise<string> {
  const {
    modelId,
    messages,
    mode,
    activeFilePath,
    activeFileContent,
    onChunk,
  } = options;

  const provider = PROVIDERS[modelId];
  if (!provider) throw new Error(`Modelo no configurado: ${modelId}`);

  const providerName = getProviderName(modelId);
  const apiKey =
    providerName === "local" ? "ollama" : sessionKeys[providerName];

  if (!apiKey && providerName !== "local") {
    throw new Error(
      `API key requerida para ${providerName}. Agrégala en configuración.`,
    );
  }

  // Build messages for API — limit history to last 3 to save tokens
  const recentMessages = messages.slice(-3);

  // Only inject file content in the LAST user message if engineer mode
  const apiMessages: { role: string; content: string }[] = [
    {
      role: "system",
      content: getSystemPrompt(mode, activeFilePath, activeFileContent),
    },
  ];

  for (const m of recentMessages) {
    let content = m.content;
    // Only inject file content when user explicitly asks to modify/create/read code
    if (
      m === recentMessages[recentMessages.length - 1] &&
      m.role === "user" &&
      activeFileContent &&
      (mode === "engineer" || mode === "plan") &&
      looksLikeCodeRequest(m.content)
    ) {
      const wantsModify = [
        "crea",
        "modifica",
        "agrega",
        "implementa",
        "arregla",
        "fix",
        "add",
        "create",
        "modify",
        "cambia",
        "escribe",
        "genera",
        "haz",
        "hazme",
        "programa",
      ].some((kw) => m.content.toLowerCase().includes(kw));
      const suffix = wantsModify
        ? "\nResponde con el código modificado en un bloque de código."
        : "\nNo modifiques el archivo, solo responde.";
      content = `${m.content}\n\nArchivo actual:\n\`\`\`\n${activeFileContent.slice(0, 2000)}\n\`\`\`${suffix}`;
    }
    apiMessages.push({ role: m.role, content });
  }

  try {
    const res = await fetch("https://astro-backend.garzaromerojeshuaabiram2019ktv.workers.dev/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        messages: apiMessages,
        temperature: mode === "engineer" ? 0.2 : 0.7,
        max_tokens: 4096,
        provider: providerName === "cerebras" ? "cerebras" : "groq",
      }),
    });
    const data = await res.json();
    const content = (data as any).choices?.[0]?.message?.content ?? "";
    if (onChunk) onChunk(content);
    return content;
  } catch (e) {
    throw new Error(String(e));
  }
}
