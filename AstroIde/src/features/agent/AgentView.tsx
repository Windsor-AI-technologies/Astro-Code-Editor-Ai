import { useState, useRef, useEffect } from 'react';
import { Bot, Send, FileText, GitBranch, Terminal, CheckCheck, X, Mic } from 'lucide-react';
import type { AIMessage } from '../../types/ai_models';
import { AI_MODELS } from '../../types/ai_models';
import { sendMessage, hasApiKey } from '../../services/ai';
import { useWorkspaceCtx } from '../../contexts/WorkspaceContext';
import { useTabsCtx } from '../../contexts/TabsContext';
import SpacetimeGrid from './SpacetimeGrid';
import { canAccessPerl } from '../../features/auth/plan';
import UpgradeWall from '../../features/auth/UpgradeWall';
import PerlView from './perl/PerlView';
import './AgentView.css';

let msgId = 0;
function newMsgId() { return `agent-msg-${++msgId}`; }

// ── Diff parser (same as AIPanel) ─────────────────────────────────────────
interface DiffLine { type: 'add' | 'del' | 'ctx'; content: string; }
interface ParsedDiff { lines: DiffLine[]; newContent: string; }

function parseDiff(aiResponse: string, originalContent: string): ParsedDiff | null {
  const diffMatch = aiResponse.match(/```diff\n([\s\S]*?)```/);
  if (diffMatch) {
    const lines: DiffLine[] = [];
    for (const line of diffMatch[1].split('\n')) {
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) continue;
      if (line.startsWith('+')) lines.push({ type: 'add', content: line.slice(1) });
      else if (line.startsWith('-')) lines.push({ type: 'del', content: line.slice(1) });
      else lines.push({ type: 'ctx', content: line.startsWith(' ') ? line.slice(1) : line });
    }
    if (lines.length === 0) return null;
    const newContent = lines.filter(l => l.type !== 'del').map(l => l.content).join('\n');
    return { lines, newContent };
  }

  const codeMatch = aiResponse.match(/```\w*\n([\s\S]*?)```/);
  if (codeMatch && codeMatch[1].trim().length > 10) {
    const newContent = codeMatch[1].trimEnd();
    if (!originalContent.trim()) {
      return { lines: newContent.split('\n').map(l => ({ type: 'add', content: l })), newContent };
    }
    const lines: DiffLine[] = [
      ...originalContent.split('\n').map(l => ({ type: 'del' as const, content: l })),
      ...newContent.split('\n').map(l => ({ type: 'add' as const, content: l })),
    ];
    return { lines, newContent };
  }
  return null;
}

type AgentMode = 'agent' | 'perl';

const AGENT_MODES: { id: AgentMode; label: string; icon: React.ReactNode }[] = [
  { id: 'agent', label: 'Agent', icon: <Bot size={13} /> },
  { id: 'perl', label: 'Perl', icon: <Mic size={13} /> },
];

export default function AgentView() {
  const { rootPath } = useWorkspaceCtx();
  const { activeTab, editorRef } = useTabsCtx();

  const [agentMode, setAgentMode] = useState<AgentMode>('agent');
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const modeSelectorRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('groq-llama3');
  const [pendingDiff, setPendingDiff] = useState<ParsedDiff | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sliding pill position
  useEffect(() => {
    const container = modeSelectorRef.current;
    if (!container) return;
    const activeBtn = container.querySelector('.agent-mode-btn.active') as HTMLElement;
    if (!activeBtn) return;
    setSliderStyle({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  }, [agentMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    if (!hasApiKey(model)) return;

    const userMsg: AIMessage = {
      id: newMsgId(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      mode: 'engineer',
      model,
    };

    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    const aiMsgId = newMsgId();
    setMessages(prev => [...prev, {
      id: aiMsgId, role: 'assistant', content: '',
      timestamp: Date.now(), mode: 'engineer', model,
    }]);

    try {
      const fileContent = editorRef.current?.getValue() ?? activeTab?.content ?? null;
      let fullContent = '';
      await sendMessage({
        modelId: model,
        messages: allMessages,
        mode: 'plan',
        activeFilePath: activeTab?.path ?? null,
        activeFileContent: fileContent,
        onChunk: (chunk) => {
          fullContent += chunk;
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
          ));
        },
      });

      // Parse diff from response
      if (activeTab?.path) {
        const currentContent = editorRef.current?.getValue() ?? activeTab?.content ?? '';
        const diff = parseDiff(fullContent, currentContent);
        if (diff && diff.lines.length > 0) {
          setPendingDiff(diff);
        }
      }
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? { ...m, content: `Error: ${e}` } : m
      ));
    }

    setIsLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="agent-view">
      {/* Sidebar siempre visible con mode selector */}
      <div className="agent-sidebar">
        {/* Mode selector inside sidebar */}
        <div className="agent-mode-selector" ref={modeSelectorRef}>
          <div
            className="agent-mode-slider"
            style={{ left: sliderStyle.left, width: sliderStyle.width }}
          />
          {AGENT_MODES.map((m) => (
            <button
              key={m.id}
              className={`agent-mode-btn ${agentMode === m.id ? 'active' : ''}`}
              onClick={() => setAgentMode(m.id)}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        <div className="agent-sidebar-header">
          <Bot size={14} />
          <span>Agent Tasks</span>
        </div>
        <div className="agent-task-list">
          {messages.filter(m => m.role === 'user').map((m, i) => (
            <div key={m.id} className="agent-task">
              <span className="agent-task-dot" />
              <span>Task {i + 1}</span>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="agent-task placeholder">
              <span className="agent-task-dot" />
              <span>No tasks yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Content area: switches between Agent chat and Perl voice */}
      {agentMode === 'perl' ? (
        canAccessPerl() ? <PerlView /> : (
          <div className="perl-locked-preview">
            <UpgradeWall feature="Perl — Voice AI" description="Your personal AI voice assistant. Control your computer, open apps, search the web, and code hands-free." isAddon />
          </div>
        )
      ) : (
        <>
      <div className="agent-main">
        <SpacetimeGrid opacity={0.5} />
        <div className="agent-chat-area">
          {messages.length === 0 ? (
            <div className="agent-empty">
              <Bot size={48} className="agent-empty-icon" />
              <h2>Astro Agent</h2>
              <p>Describe what you want to build. The agent will plan, code, and execute.</p>
              <div className="agent-capabilities">
                <div className="agent-cap"><FileText size={14} /> Read & write files</div>
                <div className="agent-cap"><Terminal size={14} /> Run commands</div>
                <div className="agent-cap"><GitBranch size={14} /> Git operations</div>
              </div>
            </div>
          ) : (
            <div className="agent-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`agent-msg agent-msg-${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="agent-msg-avatar"><Bot size={16} /></div>
                  )}
                  <div className="agent-msg-bubble">
                    <pre className="agent-msg-content">{msg.content || '...'}</pre>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="agent-input-area">
          <div className="agent-input-context">
            {activeTab?.path && <span>📄 {activeTab.path.split(/[\\/]/).pop()}</span>}
            {rootPath && <span>📁 {rootPath.split(/[\\/]/).pop()}</span>}
            <select className="agent-model-select" value={model} onChange={e => setModel(e.target.value)}>
              {AI_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="agent-input-row">
            <textarea
              ref={inputRef}
              className="agent-input"
              placeholder="Describe what you want to build..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
            <button className="agent-send" onClick={handleSend} disabled={!input.trim() || isLoading}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Panel de archivos modificados + diff */}
      <div className="agent-files-panel">
        <div className="agent-files-header">
          <span>Working Set</span>
          <span className="agent-files-count">
            {activeTab ? '1 file' : '0 files'}
          </span>
        </div>
        {activeTab ? (
          <div className="agent-file-item">
            <FileText size={12} />
            <span>{activeTab.name}</span>
          </div>
        ) : (
          <div className="agent-files-empty">No files modified yet</div>
        )}

        {/* Diff panel */}
        {pendingDiff && (
          <div className="agent-diff">
            <div className="agent-diff-header">
              <span>Changes proposed</span>
              <span className="agent-diff-stats">
                <span className="diff-add">+{pendingDiff.lines.filter(l => l.type === 'add').length}</span>
                <span className="diff-del">-{pendingDiff.lines.filter(l => l.type === 'del').length}</span>
              </span>
            </div>
            <div className="agent-diff-lines">
              {pendingDiff.lines.map((l, i) => (
                <div key={i} className={`agent-diff-line agent-diff-${l.type}`}>
                  <span className="agent-diff-sym">{l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '}</span>
                  <span>{l.content}</span>
                </div>
              ))}
            </div>
            <div className="agent-diff-actions">
              <button className="agent-diff-accept" onClick={() => {
                if (editorRef.current && pendingDiff) {
                  editorRef.current.setValue(pendingDiff.newContent);
                }
                setPendingDiff(null);
              }}>
                <CheckCheck size={12} /> Accept
              </button>
              <button className="agent-diff-discard" onClick={() => setPendingDiff(null)}>
                <X size={12} /> Discard
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
