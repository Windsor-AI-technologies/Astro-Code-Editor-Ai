
export type AIMode = 'engineer' | 'ask' | 'plan';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode: AIMode;
  model: string;
}

export const AI_MODES: { id: AIMode; name: string; icon: string; description: string }[] = [
  { id: 'engineer', name: 'Engineer', icon: '⚙️', description: 'Escribe y modifica código directamente' },
  { id: 'ask', name: 'Ask', icon: '💬', description: 'Pregunta sobre código, conceptos o errores' },
  { id: 'plan', name: 'Plan', icon: '📋', description: 'Planifica tareas y arquitectura paso a paso' },
];

export const AI_MODELS: AIModel[] = [
  { id: 'cerebras-glm', name: 'Z.ai GLM 4.7', provider: 'Cerebras', description: 'Gratis, 1M tokens/dia' },
  { id: 'cerebras-gemma', name: 'Gemma 4 31B', provider: 'Cerebras', description: 'Gratis, Google Gemma' },
  { id: 'cerebras-gpt-oss', name: 'OpenAI GPT OSS 120B', provider: 'Cerebras', description: 'Gratis, GPT open source' },
  { id: 'groq-llama3', name: 'Llama 3.3 70B', provider: 'Groq', description: 'Gratis, ultra rápido' },
  { id: 'groq-deepseek-r1', name: 'DeepSeek R1 (Groq)', provider: 'Groq', description: 'Razonamiento, gratis' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Rápido y económico' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic', description: 'Equilibrio velocidad/calidad' },
  { id: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'Anthropic', description: 'Máxima calidad' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', description: 'Context largo, razonamiento' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Gratis, rápido, multimodal' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', description: 'Open source, código' },
  { id: 'local-ollama', name: 'Ollama (Local)', provider: 'Local', description: 'Modelo local sin API key' },
];
