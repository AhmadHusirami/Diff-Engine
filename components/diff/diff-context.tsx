"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useHistory } from '@/hooks/use-history';

export type DiffSettings = {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  wordLevelDiff: boolean;
  showLineNumbers: boolean;
  collapseUnchanged: boolean;
  wordWrap: boolean;
  viewMode: 'split' | 'unified' | 'inline';
  language: string;
  syntaxTheme: string;
  colors: {
    addedBg: string;
    addedText: string;
    removedBg: string;
    removedText: string;
  };
};

export type SettingsPreset = {
  name: string;
  settings: DiffSettings;
};

const DEFAULT_SETTINGS: DiffSettings = {
  ignoreWhitespace: false,
  ignoreCase: false,
  wordLevelDiff: true,
  showLineNumbers: true,
  collapseUnchanged: false,
  wordWrap: true,
  viewMode: 'split',
  language: 'text',
  syntaxTheme: 'github',
  colors: {
    addedBg: '#22c55e33',
    addedText: '#15803d',
    removedBg: '#ef444433',
    removedText: '#b91c1c',
  },
};

type DiffContextType = {
  originalText: string;
  setOriginalText: (val: string | ((prev: string) => string)) => void;
  originalHistory: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean; reset: (val: string) => void };

  modifiedText: string;
  setModifiedText: (val: string | ((prev: string) => string)) => void;
  modifiedHistory: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean; reset: (val: string) => void };

  settings: DiffSettings;
  updateSettings: (newSettings: Partial<DiffSettings>) => void;

  isSaved: boolean;
  isLoaded: boolean;

  presets: SettingsPreset[];
  savePreset: (name: string) => void;
  deletePreset: (name: string) => void;
  loadPreset: (name: string) => void;
};

const DiffContext = createContext<DiffContextType | undefined>(undefined);

export function DiffProvider({ children }: { children: ReactNode }) {
  const [originalText, setOriginalText, originalHistory] = useHistory('');
  const [modifiedText, setModifiedText, modifiedHistory] = useHistory('');
  const [settings, setSettings] = useState<DiffSettings>(DEFAULT_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [presets, setPresets] = useState<SettingsPreset[]>([]);

  useEffect(() => {
    const savedOrig = localStorage.getItem('diff_originalText');
    const savedMod = localStorage.getItem('diff_modifiedText');
    const savedSettings = localStorage.getItem('diff_settings');
    const savedPresets = localStorage.getItem('diff_presets');

    setTimeout(() => {
      if (savedOrig) originalHistory.reset(savedOrig);
      if (savedMod) modifiedHistory.reset(savedMod);
      if (savedSettings) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
        } catch (e) {
          console.error('Failed to parse settings', e);
        }
      }
      if (savedPresets) {
        try {
          setPresets(JSON.parse(savedPresets));
        } catch (e) {
          console.error('Failed to parse presets', e);
        }
      }
      setIsLoaded(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setTimeout(() => setIsSaved(false), 0);
      const timer = setTimeout(() => {
        localStorage.setItem('diff_originalText', originalText);
        localStorage.setItem('diff_modifiedText', modifiedText);
        localStorage.setItem('diff_settings', JSON.stringify(settings));
        localStorage.setItem('diff_presets', JSON.stringify(presets));
        setIsSaved(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [originalText, modifiedText, settings, presets, isLoaded]);

  const updateSettings = (newSettings: Partial<DiffSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const savePreset = useCallback((name: string) => {
    setPresets((prev) => {
      const filtered = prev.filter((p) => p.name !== name);
      return [...filtered, { name, settings }];
    });
  }, [settings]);

  const deletePreset = useCallback((name: string) => {
    setPresets((prev) => prev.filter((p) => p.name !== name));
  }, []);

  const loadPreset = useCallback((name: string) => {
    const preset = presets.find((p) => p.name === name);
    if (preset) {
      setSettings(preset.settings);
    }
  }, [presets]);

  return (
    <DiffContext.Provider
      value={{
        originalText,
        setOriginalText,
        originalHistory,
        modifiedText,
        setModifiedText,
        modifiedHistory,
        settings,
        updateSettings,
        isSaved,
        isLoaded,
        presets,
        savePreset,
        deletePreset,
        loadPreset,
      }}
    >
      {children}
    </DiffContext.Provider>
  );
}

export function useDiffContext() {
  const context = useContext(DiffContext);
  if (context === undefined) {
    throw new Error('useDiffContext must be used within a DiffProvider');
  }
  return context;
}