// ── Action Registry ──────────────────────────────────────────────────────────
// Central command system. Any module, feature, or extension can register actions.
// The command palette, shortcuts, menus, and extensions all consume from here.

export interface Action {
  id: string;
  title: string;
  category?: string;         // e.g. "Editor", "Terminal", "Git", "Extension"
  shortcut?: string;         // e.g. "Ctrl+Shift+P"
  icon?: string;             // lucide icon name or emoji
  when?: () => boolean;      // condition to show/enable the action
  run: (...args: any[]) => void | Promise<void>;
}

// ── Registry (singleton) ─────────────────────────────────────────────────────

const actions = new Map<string, Action>();
const listeners = new Set<() => void>();

/** Register a new action. Overwrites if id already exists. */
export function registerAction(action: Action): () => void {
  actions.set(action.id, action);
  notifyListeners();
  // Return unregister function (useful for extensions)
  return () => {
    actions.delete(action.id);
    notifyListeners();
  };
}

/** Register multiple actions at once. Returns unregister-all function. */
export function registerActions(actionList: Action[]): () => void {
  const unregisters = actionList.map(a => registerAction(a));
  return () => unregisters.forEach(fn => fn());
}

/** Unregister an action by id */
export function unregisterAction(id: string): void {
  actions.delete(id);
  notifyListeners();
}

/** Get a single action by id */
export function getAction(id: string): Action | undefined {
  return actions.get(id);
}

/** Get all registered actions */
export function getAllActions(): Action[] {
  return Array.from(actions.values());
}

/** Get actions filtered by category */
export function getActionsByCategory(category: string): Action[] {
  return getAllActions().filter(a => a.category === category);
}

/** Search actions by title (fuzzy) */
export function searchActions(query: string): Action[] {
  if (!query.trim()) return getAllActions();
  const lower = query.toLowerCase();
  return getAllActions().filter(a =>
    a.title.toLowerCase().includes(lower) ||
    a.id.toLowerCase().includes(lower) ||
    (a.category?.toLowerCase().includes(lower) ?? false)
  );
}

/** Execute an action by id */
export function executeAction(id: string, ...args: any[]): void {
  const action = actions.get(id);
  if (!action) return;
  if (action.when && !action.when()) return;
  action.run(...args);
}

/** Subscribe to registry changes (actions added/removed) */
export function onActionsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach(fn => fn());
}

/** Get count of registered actions */
export function getActionCount(): number {
  return actions.size;
}
