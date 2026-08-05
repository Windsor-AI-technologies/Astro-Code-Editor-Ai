import '@testing-library/jest-dom';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@monaco-editor/react', () => ({
  loader: { init: vi.fn(() => Promise.resolve({ editor: { getModels: () => [] } })) },
}));
