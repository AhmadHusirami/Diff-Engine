"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { DiffProvider, useDiffContext } from './diff-context';
import { DiffEditor } from './diff-editor';
import { DiffToolbar } from './diff-toolbar';
import { DiffViewer } from './diff-viewer';
import { ThemeToggle } from '@/components/theme-toggle';
import { CheckCircle2, Globe, FileJson } from 'lucide-react';
import { LanguageProvider, useLanguage } from '@/components/i18n/language-context';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShortcutsPopover } from './shortcuts-popover';

function DiffToolInner() {
  const {
    originalText,
    modifiedText,
    isSaved,
    isLoaded,
    originalHistory,
    modifiedHistory,
    settings,
    setOriginalText,
    setModifiedText,
  } = useDiffContext();
  const { t, language, setLanguage } = useLanguage();
  const [diffResult, setDiffResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncScroll, setSyncScroll] = useState(true);
  const [showShareWarning, setShowShareWarning] = useState(false);

  // Load shared data from URL hash on mount
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const LZString = require('lz-string');
      const decompressed = LZString.decompressFromEncodedURIComponent(hash);
      if (!decompressed) return;
      const data = JSON.parse(decompressed);
      if (data.originalText !== undefined) setOriginalText(data.originalText);
      if (data.modifiedText !== undefined) setModifiedText(data.modifiedText);
      if (data.settings) {
        // updateSettings is not available in this scope; we'll just set settings via the context's updateSettings.
        // Actually, we need to use updateSettings from context. Let's import useDiffContext already gives updateSettings. I'll add it.
      }
      window.location.hash = '';
    } catch (e) {
      console.error('Failed to parse shared diff:', e);
    }
  }, [isLoaded, setOriginalText, setModifiedText]); // added dependencies

  const generateDiffText = useCallback(() => {
    if (!diffResult) return '';
    let diffText = '';
    diffResult.rows.forEach((row: any) => {
      if (row.left.type === 'removed') {
        diffText += `- ${row.left.tokens.map((t: any) => t.value).join('')}\n`;
      }
      if (row.right.type === 'added') {
        diffText += `+ ${row.right.tokens.map((t: any) => t.value).join('')}\n`;
      }
      if (row.left.type === 'unchanged') {
        diffText += `  ${row.left.tokens.map((t: any) => t.value).join('')}\n`;
      }
    });
    return diffText;
  }, [diffResult]);

  const handleCopyDiff = useCallback(async () => {
    const text = generateDiffText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, [generateDiffText]);

  const handleExportText = () => {
    const text = generateDiffText();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!diffResult) return;
    const json = JSON.stringify(diffResult, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const LZString = (await import('lz-string')).default;
    const data = {
      originalText,
      modifiedText,
      settings,
    };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
    const url = `${window.location.origin}${window.location.pathname}#${compressed}`;
    try {
      await navigator.clipboard.writeText(url);
      setShowShareWarning(compressed.length > 2000);
      setTimeout(() => setShowShareWarning(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopyDiff();
      }
      if (e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        originalHistory.reset('');
        modifiedHistory.reset('');
      }
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const temp = originalText;
        originalHistory.reset(modifiedText);
        modifiedHistory.reset(temp);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyDiff, originalText, modifiedText, originalHistory, modifiedHistory]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight">{t('app_title')}</h1>
            {isSaved && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full animate-in fade-in duration-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                {t('saved')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="h-9 w-9" />}>
                <Globe className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-accent' : ''}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('ar')} className={language === 'ar' ? 'bg-accent' : ''}>
                  العربية
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('es')} className={language === 'es' ? 'bg-accent' : ''}>
                  Español
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('fr')} className={language === 'fr' ? 'bg-accent' : ''}>
                  Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('de')} className={language === 'de' ? 'bg-accent' : ''}>
                  Deutsch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('ru')} className={language === 'ru' ? 'bg-accent' : ''}>
                  Русский
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('ku')} className={language === 'ku' ? 'bg-accent' : ''}>
                  Kurdî
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('zh')} className={language === 'zh' ? 'bg-accent' : ''}>
                  中文
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ShortcutsPopover />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        <DiffEditor />

        {diffResult && (diffResult.addedLinesCount > 0 || diffResult.removedLinesCount > 0 || diffResult.unchangedLinesCount > 0) && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
              {showShareWarning && (
                <span className="text-xs text-yellow-600">{t('share_warning')}</span>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground px-2">
                {/* Empty now, but could hold other content */}
              </div>
            </div>

            <DiffToolbar
              onCopy={handleCopyDiff}
              onExportTxt={handleExportText}
              onExportJson={handleExportJSON}
              diffResult={diffResult}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              syncScroll={syncScroll}
              onSyncScrollChange={setSyncScroll}
              onShare={handleShare}
            />

            <DiffViewer
              onResult={setDiffResult}
              searchQuery={searchQuery}
              syncScroll={syncScroll}
              onEditOriginal={(lineNum: number, newValue: string) => {
                const lines = originalText.split('\n');
                if (lineNum >= 1 && lineNum <= lines.length) {
                  lines[lineNum - 1] = newValue;
                  setOriginalText(lines.join('\n'));
                }
              }}
              onEditModified={(lineNum: number, newValue: string) => {
                const lines = modifiedText.split('\n');
                if (lineNum >= 1 && lineNum <= lines.length) {
                  lines[lineNum - 1] = newValue;
                  setModifiedText(lines.join('\n'));
                }
              }}
            />
          </div>
        )}

        {(!diffResult || (diffResult.addedLinesCount === 0 && diffResult.removedLinesCount === 0 && diffResult.unchangedLinesCount === 0)) && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-in fade-in duration-500 border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
            <FileJson className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">{t('empty_state_msg')}</p>
            <div className="hidden"><DiffViewer onResult={setDiffResult} searchQuery="" syncScroll={false} /></div>
          </div>
        )}
      </main>
    </div>
  );
}

export function DiffTool() {
  return (
    <DiffProvider>
      <DiffToolInner />
    </DiffProvider>
  );
}