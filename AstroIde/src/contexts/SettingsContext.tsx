import { createContext, useContext } from 'react';
import type { AppSettings } from '../types';

export interface SettingsContextValue {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  settingsOpen: boolean;
  toggleSettings: () => void;
  themeId: string;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const SettingsContext = createContext<SettingsContextValue>(null!);
export const useSettingsCtx = () => useContext(SettingsContext);
