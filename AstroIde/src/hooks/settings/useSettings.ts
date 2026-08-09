import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../../types';
import { DEFAULT_SETTINGS } from '../../types';
import { applyTheme } from '../../themes';
import * as api from '../../services/tauri';

/**
 * Settings store — manages app settings lifecycle.
 * 
 * SOLID: Single Responsibility — load, save, update settings.
 * Applies theme CSS vars reactively when colorTheme changes.
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const themeId = settings['workbench.colorTheme'];

  // Load from disk on startup
  useEffect(() => {
    api.loadSettings()
      .then(json => {
        try {
          const parsed = JSON.parse(json);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch { /* use defaults */ }
      })
      .catch(() => { /* use defaults */ });
  }, []);

  // Apply CSS theme vars when theme changes
  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  // Save to disk
  const saveSettings = useCallback(async (): Promise<boolean> => {
    try {
      await api.saveSettings(JSON.stringify(settings, null, 2));
      return true;
    } catch {
      return false;
    }
  }, [settings]);

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Batch update
  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  return {
    settings,
    setSettings,
    settingsOpen,
    setSettingsOpen,
    themeId,
    saveSettings,
    updateSetting,
    updateSettings,
  };
}
