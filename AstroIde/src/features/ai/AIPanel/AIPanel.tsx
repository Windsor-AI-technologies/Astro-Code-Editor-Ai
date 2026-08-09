import { useState, useRef, useEffect } from "react";
import { Send, Trash2, PanelRightClose, Copy, Check, Key, CheckCheck, X } from "lucide-react";
import type * as Monaco from "monaco-editor";
import type { AIMode, AIMessage } from "../../../types/ai_models";
import { AI_MODES, AI_MODELS } from "../../../types/ai_models";
import { sendMessage, setApiKey, hasApiKey } from "../../../services/ai";
import { useTabsCtx } from "../../../contexts/TabsContext";
import BlackHoleIcon from "./iconAstro/iconsAstro";
import "./AIPanel.css";


// Bloque de código con syntax highlighting visual y botón copiar
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="ai-code-block">
      <div className="ai-code-header">
        <span className="ai-code-lang">{lang || "code"}</span>
        <button className="ai-code-copy" onClick={handleCopy}>
          {copied ? (
            <>
              <Check size={11} /> Copiado
            </>
          ) : (
            <>
              <Copy size={11} /> Copiar
            </>
          )}
        </button>
      </div>
      <pre className="ai-code-pre">
        <code dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} />
      </pre>
    </div>
  );
}

// Syntax highlighter básico con regex
function highlightCode(code: string, lang: string): string {
  // Escapar HTML
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Comments (// y /* */ y #)
  html = html.replace(
    /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm,
    '<span class="hl-comment">$1</span>',
  );

  // Strings (dobles, simples, template literals)
  html = html.replace(
    /(?<!\\)(&quot;.*?&quot;|'.*?'|`.*?`|".*?")/g,
    '<span class="hl-string">$1</span>',
  );

  // Keywords según lenguaje
  const keywords = getKeywords(lang);
  if (keywords.length > 0) {
    const kwRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
    html = html.replace(kwRegex, '<span class="hl-keyword">$1</span>');
  }

  // Types / clases (PascalCase)
  html = html.replace(
    /\b([A-Z][a-zA-Z0-9]+)\b/g,
    '<span class="hl-type">$1</span>',
  );

  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');

  // Functions (palabra seguida de paréntesis)
  html = html.replace(
    /\b([a-zA-Z_]\w*)\s*(?=\()/g,
    '<span class="hl-function">$1</span>',
  );

  return html;
}

function getKeywords(lang: string): string[] {
  const map: Record<string, string[]> = {
    typescript: [
      "const",
      "let",
      "var",
      "function",
      "return",
      "if",
      "else",
      "for",
      "while",
      "class",
      "interface",
      "type",
      "import",
      "export",
      "from",
      "default",
      "async",
      "await",
      "new",
      "this",
      "extends",
      "implements",
      "static",
      "public",
      "private",
      "protected",
      "readonly",
      "enum",
      "namespace",
      "module",
      "declare",
      "abstract",
      "try",
      "catch",
      "throw",
      "switch",
      "case",
      "break",
      "continue",
      "do",
      "of",
      "in",
      "void",
      "null",
      "undefined",
      "true",
      "false",
      "typeof",
      "instanceof",
    ],
    javascript: [
      "const",
      "let",
      "var",
      "function",
      "return",
      "if",
      "else",
      "for",
      "while",
      "class",
      "import",
      "export",
      "from",
      "default",
      "async",
      "await",
      "new",
      "this",
      "extends",
      "try",
      "catch",
      "throw",
      "switch",
      "case",
      "break",
      "continue",
      "do",
      "of",
      "in",
      "void",
      "null",
      "undefined",
      "true",
      "false",
      "typeof",
      "instanceof",
    ],
    python: [
      "def",
      "class",
      "return",
      "if",
      "elif",
      "else",
      "for",
      "while",
      "import",
      "from",
      "as",
      "try",
      "except",
      "finally",
      "with",
      "pass",
      "break",
      "continue",
      "and",
      "or",
      "not",
      "in",
      "is",
      "None",
      "True",
      "False",
      "self",
      "lambda",
      "yield",
      "async",
      "await",
      "raise",
      "global",
      "nonlocal",
    ],
    rust: [
      "fn",
      "let",
      "mut",
      "const",
      "if",
      "else",
      "for",
      "while",
      "loop",
      "match",
      "return",
      "struct",
      "enum",
      "impl",
      "trait",
      "pub",
      "use",
      "mod",
      "crate",
      "self",
      "super",
      "async",
      "await",
      "move",
      "ref",
      "type",
      "where",
      "unsafe",
      "static",
      "extern",
      "true",
      "false",
      "Some",
      "None",
      "Ok",
      "Err",
    ],
    go: [
      "func",
      "return",
      "if",
      "else",
      "for",
      "range",
      "switch",
      "case",
      "break",
      "continue",
      "var",
      "const",
      "type",
      "struct",
      "interface",
      "map",
      "package",
      "import",
      "defer",
      "go",
      "chan",
      "select",
      "nil",
      "true",
      "false",
      "make",
      "new",
      "append",
      "len",
    ],
    java: [
      "class",
      "interface",
      "extends",
      "implements",
      "public",
      "private",
      "protected",
      "static",
      "final",
      "void",
      "int",
      "String",
      "boolean",
      "return",
      "if",
      "else",
      "for",
      "while",
      "new",
      "this",
      "super",
      "try",
      "catch",
      "throw",
      "throws",
      "import",
      "package",
      "null",
      "true",
      "false",
    ],
    css: [
      "color",
      "background",
      "display",
      "flex",
      "grid",
      "position",
      "margin",
      "padding",
      "border",
      "width",
      "height",
      "font",
      "transition",
      "animation",
      "opacity",
      "overflow",
      "none",
      "solid",
      "relative",
      "absolute",
      "fixed",
      "inherit",
      "auto",
      "important",
    ],
    html: [
      "div",
      "span",
      "input",
      "button",
      "form",
      "head",
      "body",
      "html",
      "script",
      "style",
      "link",
      "meta",
      "title",
      "class",
      "id",
      "src",
      "href",
      "type",
    ],
    csharp: [
      "class",
      "interface",
      "struct",
      "enum",
      "namespace",
      "using",
      "public",
      "private",
      "protected",
      "internal",
      "static",
      "void",
      "int",
      "string",
      "bool",
      "var",
      "return",
      "if",
      "else",
      "for",
      "foreach",
      "while",
      "new",
      "this",
      "base",
      "try",
      "catch",
      "throw",
      "async",
      "await",
      "null",
      "true",
      "false",
      "override",
      "virtual",
      "abstract",
      "sealed",
    ],
  };
  // Aliases
  const aliases: Record<string, string> = {
    ts: "typescript",
    js: "javascript",
    py: "python",
    rs: "rust",
    cs: "csharp",
  };
  const resolved = aliases[lang] || lang;
  return map[resolved] || map["typescript"] || [];
}

// Parsea contenido del mensaje: detecta ```bloques``` y texto con **bold**, `inline code`
// Si no hay bloques explícitos pero parece código, lo envuelve automáticamente
function MessageContent({ content }: { content: string }) {
  const parts: { type: "text" | "code"; content: string; lang?: string }[] = [];
  const codeRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }
    parts.push({ type: "code", content: match[2].trimEnd(), lang: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", content });
  }

  // Si todo es texto y parece código, envolver en bloque
  if (
    parts.length === 1 &&
    parts[0].type === "text" &&
    looksLikeCode(parts[0].content)
  ) {
    return (
      <div className="ai-msg-text">
        <CodeBlock
          code={parts[0].content.trim()}
          lang={guessLang(parts[0].content)}
        />
      </div>
    );
  }

  return (
    <div className="ai-msg-text">
      {parts.map((part, i) => {
        if (part.type === "code") {
          return (
            <CodeBlock key={i} code={part.content} lang={part.lang || ""} />
          );
        }
        return <TextBlock key={i} text={part.content} />;
      })}
    </div>
  );
}

// Detecta si un texto parece código
function looksLikeCode(text: string): boolean {
  const lines = text.split("\n");
  if (lines.length < 3) return false;
  const codeIndicators = [
    "{",
    "}",
    ";",
    "=>",
    "function ",
    "class ",
    "const ",
    "let ",
    "import ",
    "def ",
    "fn ",
    "pub ",
    "#include",
    "interface ",
    "export ",
  ];
  const matches = codeIndicators.filter((ind) => text.includes(ind));
  return matches.length >= 2;
}

// Adivina el lenguaje por contenido
function guessLang(text: string): string {
  if (
    text.includes("interface ") ||
    text.includes(": string") ||
    text.includes("<T>")
  )
    return "typescript";
  if (
    text.includes("def ") ||
    text.includes("self.") ||
    text.includes("import ")
  )
    return "python";
  if (text.includes("fn ") || text.includes("let mut") || text.includes("pub "))
    return "rust";
  if (text.includes("func ") || text.includes(":= ")) return "go";
  if (text.includes("public class") || text.includes("System.out"))
    return "java";
  if (
    text.includes("function") ||
    text.includes("const ") ||
    text.includes("=>")
  )
    return "javascript";
  return "code";
}

// Render de texto con formato básico
function TextBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="ai-text-line">
          {renderInline(line)}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

// Render inline: **bold**, `code`, > quotes
function renderInline(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\>\s?(.+))/g;
  let lastIdx = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(<span key={key++}>{text.slice(lastIdx, match.index)}</span>);
    }
    if (match[1]) {
      // **bold**
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      // `inline code`
      parts.push(
        <code key={key++} className="ai-inline-code">
          {match[4]}
        </code>,
      );
    } else if (match[5]) {
      // > quote
      parts.push(
        <span key={key++} className="ai-quote">
          {match[6]}
        </span>,
      );
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIdx)}</span>);
  }

  return parts.length > 0 ? parts : text;
}

// ── Diff View Component ───────────────────────────────────────────────────────

function DiffView({ diff, onAccept, onDiscard }: {
  diff: ParsedDiff;
  onAccept: () => void;
  onDiscard: () => void;
}) {
  const added = diff.lines.filter(l => l.type === 'add').length;
  const removed = diff.lines.filter(l => l.type === 'del').length;

  return (
    <div className="ai-diff-panel">
      <div className="ai-diff-header">
        <span className="ai-diff-title">Cambios propuestos</span>
        <div className="ai-diff-stats">
          <span className="ai-diff-added">+{added}</span>
          <span className="ai-diff-removed">-{removed}</span>
        </div>
      </div>
      <div className="ai-diff-lines">
        {diff.lines.map((line, i) => (
          <div key={i} className={`ai-diff-line ai-diff-line-${line.type}`}>
            <span className="ai-diff-symbol">
              {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
            </span>
            <span className="ai-diff-content">{line.content}</span>
          </div>
        ))}
      </div>
      <div className="ai-diff-actions">
        <button className="ai-diff-accept" onClick={onAccept}>
          <CheckCheck size={13} /> Aceptar
        </button>
        <button className="ai-diff-discard" onClick={onDiscard}>
          <X size={13} /> Descartar
        </button>
      </div>
    </div>
  );
}

// ── Diff Types & Parser ───────────────────────────────────────────────────────

interface DiffLine {
  type: 'add' | 'del' | 'ctx';
  content: string;
}

interface ParsedDiff {
  lines: DiffLine[];
  newContent: string;
}

function parseDiff(aiResponse: string, originalContent: string): ParsedDiff | null {
  // 1. Try unified diff format first
  const diffMatch = aiResponse.match(/```diff\n([\s\S]*?)```/);
  if (diffMatch) {
    const rawDiff = diffMatch[1];
    const diffLines = rawDiff.split('\n');
    const lines: DiffLine[] = [];

    for (const line of diffLines) {
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) continue;
      if (line.startsWith('+')) lines.push({ type: 'add', content: line.slice(1) });
      else if (line.startsWith('-')) lines.push({ type: 'del', content: line.slice(1) });
      else lines.push({ type: 'ctx', content: line.startsWith(' ') ? line.slice(1) : line });
    }

    if (lines.length === 0) return null;

    const newLines: string[] = [];
    for (const l of lines) {
      if (l.type !== 'del') newLines.push(l.content);
    }

    return { lines, newContent: newLines.join('\n') || originalContent };
  }

  // 2. Fallback: detect any code block and use as full replacement
  const codeMatch = aiResponse.match(/```\w*\n([\s\S]*?)```/);
  if (codeMatch && codeMatch[1].trim().length > 10) {
    const newContent = codeMatch[1].trimEnd();
    
    // If original is empty/whitespace, everything is "added"
    if (!originalContent.trim()) {
      const addedLines = newContent.split('\n');
      const lines: DiffLine[] = addedLines.map(l => ({ type: 'add', content: l }));
      return { lines, newContent };
    }

    // Simple comparison: mark all original as removed, all new as added
    const origLines = originalContent.split('\n');
    const newLines = newContent.split('\n');
    const lines: DiffLine[] = [
      ...origLines.map(l => ({ type: 'del' as const, content: l })),
      ...newLines.map(l => ({ type: 'add' as const, content: l })),
    ];

    return { lines, newContent };
  }

  return null;
}

interface AIPanelProps {  visible: boolean;
  onToggle: () => void;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
  activeFilePath: string | null;
  activeFileContent?: string | null;
  acrylic: boolean;
  editorRef?: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
}

let msgId = 0;
function newMsgId() {
  return `msg-${++msgId}`;
}

export default function AIPanel({
  visible,
  onToggle,
  width,
  onResizeStart: _onResizeStart,
  activeFilePath,
  activeFileContent,
  acrylic,
  editorRef,
}: AIPanelProps) {
  const { setDiffPreview } = useTabsCtx();
  const [mode, setMode] = useState<AIMode>("ask");
  const [model, setModel] = useState<string>("groq-llama3");
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<ParsedDiff | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
  }

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    // Check API key
    if (!hasApiKey(model)) {
      setShowKeyInput(true);
      return;
    }

    const userMsg: AIMessage = {
      id: newMsgId(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
      mode,
      model,
    };

    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    if (inputRef.current) inputRef.current.style.height = "auto";

    // Streaming placeholder message
    const aiMsgId = newMsgId();
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      mode,
      model,
    }]);

    try {
      let fullContent = '';
      await sendMessage({
        modelId: model,
        messages: allMessages,
        mode,
        activeFilePath,
        activeFileContent: (mode === 'engineer' || mode === 'plan') ? activeFileContent : null,
        onChunk: (chunk) => {
          fullContent += chunk;
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
          ));
        },
      });

      // Parse diff if engineer/plan mode and file is open
      if ((mode === 'engineer' || mode === 'plan') && activeFilePath) {
        const currentContent = editorRef?.current?.getValue() ?? activeFileContent ?? '';
        const diff = parseDiff(fullContent, currentContent);
        if (diff && diff.lines.length > 0) {
          setPendingDiff(diff);
          const added: number[] = [];
          const removed: number[] = [];
          let addLine = 1;
          for (const l of diff.lines) {
            if (l.type === 'add') { added.push(addLine); addLine++; }
            else if (l.type === 'del') { removed.push(addLine); }
            else { addLine++; }
          }
          if (added.length > 0 || removed.length > 0) {
            setDiffPreview({ added, removed });
          }
        }
      }
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: `Error: ${e}` }
          : m
      ));
    }

    setIsLoading(false);
  }

  function handleSaveKey() {
    if (!apiKeyInput.trim()) return;
    // Determine provider from model
    const providerMap: Record<string, string> = {
      'deepseek-r1': 'deepseek', 'deepseek-v3': 'deepseek',
      'gpt-4o': 'openai', 'gpt-4o-mini': 'openai',
      'claude-4-sonnet': 'anthropic', 'claude-4-opus': 'anthropic',
      'gemini-2.5-pro': 'google', 'gemini-2.0-flash': 'google',
      'groq-llama3': 'groq', 'groq-deepseek-r1': 'groq',
      'cerebras-glm': 'cerebras', 'cerebras-gemma': 'cerebras', 'cerebras-gpt-oss': 'cerebras',
    };
    const provider = providerMap[model] ?? model;
    setApiKey(provider, apiKeyInput.trim());
    setApiKeyInput("");
    setShowKeyInput(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleAcceptDiff() {
    if (!pendingDiff || !editorRef?.current) return;
    // AHORA sí aplicar los cambios al editor
    editorRef.current.setValue(pendingDiff.newContent);
    setDiffPreview(null);
    setPendingDiff(null);
  }

  function handleDiscardDiff() {
    // No tocar el editor — el contenido original sigue intacto
    setDiffPreview(null);
    setPendingDiff(null);
  }

  if (!visible) return null;

  return (
    <div className={`ai-panel${acrylic ? " acrylic" : ""}`} style={{ width }}>
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-left">
          <BlackHoleIcon size={18} />
          <div className="ai-brand">
            <span className="ai-brand-name">Astro Quasar</span>
            <span className="ai-brand-model">
              {AI_MODELS.find((m) => m.id === model)?.name}
            </span>
          </div>
        </div>
        <button
          className="ai-header-close"
          onClick={onToggle}
          title="Cerrar (Ctrl+Shift+A)"
        >
          <PanelRightClose size={14} />
        </button>
      </div>

      {/* Mode selector */}
      <div className="ai-modes">
        {AI_MODES.map((m) => (
          <button
            key={m.id}
            className={`ai-mode-btn ${mode === m.id ? "active" : ""}`}
            onClick={() => setMode(m.id)}
            title={m.description}
          >
            <span className="ai-mode-icon">{m.icon}</span>
            <span>{m.name}</span>
          </button>
        ))}
      </div>

      {/* Model selector */}
      <div className="ai-model-bar">
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          {AI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.provider}
            </option>
          ))}
        </select>
        <button
          className="ai-clear-btn"
          onClick={() => setMessages([])}
          title="Limpiar chat"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {messages.length === 0 && (
          <div className="ai-empty">
            <BlackHoleIcon size={48} />
            <h3>Astro Quasar</h3>
            <p>Tu asistente de codigo con IA</p>
            <div className="ai-empty-modes">
              {AI_MODES.map((m) => (
                <div key={m.id} className="ai-empty-mode" onClick={() => { setMode(m.id); inputRef.current?.focus(); }}>
                  <span>{m.icon}</span>
                  <div>
                    <strong>{m.name}</strong>
                    <span>{m.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`ai-msg ai-msg-${msg.role}`}>
            {msg.role === "assistant" && (
              <div className="ai-msg-avatar">
                <BlackHoleIcon size={16} />
              </div>
            )}
            <div className="ai-msg-bubble">
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="ai-msg ai-msg-assistant">
            <div className="ai-msg-avatar"><BlackHoleIcon size={16} /></div>
            <div className="ai-msg-bubble">
              <div className="ai-typing"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending diff */}
      {pendingDiff && (
        <DiffView
          diff={pendingDiff}
          onAccept={handleAcceptDiff}
          onDiscard={handleDiscardDiff}
        />
      )}

      {/* API Key input */}
      {showKeyInput && (
        <div className="ai-key-input-area">
          <div className="ai-key-label">
            <Key size={11} /> API Key para {AI_MODELS.find(m => m.id === model)?.provider}
          </div>
          <div className="ai-key-row">
            <input
              className="ai-key-input"
              type="password"
              placeholder="sk-..."
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(); if (e.key === 'Escape') setShowKeyInput(false); }}
              autoFocus
            />
            <button className="ai-key-save-btn" onClick={handleSaveKey}>Guardar</button>
          </div>
          <div className="ai-key-hint">La key se guarda solo en memoria, no en disco.</div>
        </div>
      )}

      {/* Input */}
      <div className="ai-input-area">
        {activeFilePath && (
          <div className="ai-input-context">
            <span>📄 {activeFilePath.split(/[\\/]/).pop()}</span>
            <span className="ai-context-mode">
              {AI_MODES.find((m) => m.id === mode)?.icon} {mode}
            </span>
          </div>
        )}
        <div className="ai-input-row">
          <textarea
            ref={inputRef}
            className="ai-input"
            placeholder={mode === 'engineer' ? "Describe qué quieres que haga..." : mode === 'plan' ? "Describe qué quieres planificar..." : "Pregunta lo que necesites..."}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="ai-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
