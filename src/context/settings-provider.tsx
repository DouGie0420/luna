'use client';

import React, { createContext, useState, useEffect, useMemo, ReactNode } from 'react';

export interface AppSettings {
  // messageSoundEnabled: boolean; // This setting is being removed
}

interface SettingsContextType {
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  // messageSoundEnabled: true, // This setting is being removed
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('app-settings');
      if (storedSettings) {
        setSettingsState({ ...defaultSettings, ...JSON.parse(storedSettings) });
      }
    } catch (e) {
      console.error('Failed to parse settings from localStorage', e);
      localStorage.removeItem('app-settings');
    }
    setIsInitialized(true);
  }, []);

  const setSettings = (newSettings: Partial<AppSettings>) => {
    setSettingsState(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      try {
        localStorage.setItem('app-settings', JSON.stringify(updatedSettings));
      } catch (e) {
        console.error('Failed to save settings to localStorage', e);
      }
      return updatedSettings;
    });
  };

  const value = useMemo(() => ({
    settings,
    setSettings,
  }), [settings]);

  if (!isInitialized) {
    return null; // or a loading spinner
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
