import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppSettings, RelayPreferenceMode, ThemeMode } from '../types';
import { getStoredValue, setStoredValue } from '../utils/storage';
import { registryFallbackUrl } from '../utils/network';

const DEFAULT_SETTINGS: AppSettings = {
  registryUrl: registryFallbackUrl(),
  nickname: 'Guest',
  themeMode: 'dark',
  relayPreferenceMode: 'auto',
  selectedRelayId: '',
  chatBackgroundImage: '',
  accentColor: '#26c6da',
  savedAccentColors: []
};

const STORAGE_KEY = 'cyan-chat-settings-v1';

interface SettingsContextValue {
  settings: AppSettings;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setNickname: (nickname: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const storedSettings = getStoredValue(STORAGE_KEY, DEFAULT_SETTINGS);

    return {
      ...DEFAULT_SETTINGS,
      ...storedSettings,
      chatBackgroundImage: storedSettings.chatBackgroundImage?.startsWith('data:image/')
        ? storedSettings.chatBackgroundImage
        : ''
    };
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setStoredValue(STORAGE_KEY, settings);
  }, [settings]);

  const value = useMemo<SettingsContextValue>(() => {
    const updateSettings = (partial: Partial<AppSettings>) => {
      setSettings((prev) => ({ ...prev, ...partial }));
    };

    const setThemeMode = (mode: ThemeMode) => updateSettings({ themeMode: mode });
    const setNickname = (nickname: string) => updateSettings({ nickname });

    return {
      settings,
      settingsOpen,
      setSettingsOpen,
      updateSettings,
      setThemeMode,
      setNickname
    };
  }, [settings, settingsOpen]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
