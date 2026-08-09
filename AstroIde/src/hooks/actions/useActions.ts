import { useState, useEffect, useCallback } from "react";
import {
  getAllActions,
  searchActions,
  executeAction,
  onActionsChanged,
  registerActions,
  type Action,
} from "../../services/core/actionRegistry";

/**
 * useActions — React hook to consume the Action Registry.
 * Subscribes to changes and provides search/execute functions.
 */
export function useActions() {
  const [actions, setActions] = useState<Action[]>(getAllActions);

  useEffect(() => {
    const unsub = onActionsChanged(() => setActions(getAllActions()));
    return unsub;
  }, []);

  const search = useCallback((query: string) => searchActions(query), []);
  const execute = useCallback(
    (id: string, ...args: any[]) => executeAction(id, ...args),
    [],
  );

  return { actions, search, execute };
}

export { registerActions, type Action };
