"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DiffProvider, useDiffContext } from './diff-context';
import { DiffEditor } from './diff-editor';
import { DiffToolbar } from './diff-toolbar';
import { DiffViewer } from './diff-viewer';
import { ThemeToggle } from '@/components/theme-toggle';
import { CheckCircle2, Globe, FileJson, Download } from 'lucide-react';
import { LanguageProvider, useLanguage } from '@/components/i18n/language-context';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShortcutsPopover } from './shortcuts-popover';
import { CommandPalette } from '@/components/command-palette';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { computeDiffStats, generateMergedText } from '@/lib/diff-utils';

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
    updateSettings,
  } = useDiffContext();
  const { t, setLanguage } = useLanguage();
  const [diffResult, setDiffResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncScroll, setSyncScroll] = useState(true);
  const [showMinimap, setShowMinimap] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeDecisions, setMergeDecisions] = useState<Map<number, 'left' | 'right' | 'both' | 'discard'>>(new Map());
  const [shareUrl, setShareUrl] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [reorderDetection, setReorderDetection] = useState(false);
  const [similarityHeatmap, setSimilarityHeatmap] = useState(false);

  const stats = useMemo(() => {
    if (!originalText && !modifiedText) return null;
    return computeDiffStats(originalText, modifiedText, { ignoreWhitespace: settings.ignoreWhitespace, ignoreCase: settings.ignoreCase });
  }, [originalText, modifiedText, settings.ignoreWhitespace, settings.ignoreCase]);

  // Load shared URL with expiry check
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const LZString = require('lz-string');
      const decompressed = LZString.decompressFromEncodedURIComponent(hash);
      if (!decompressed) return;
      const data = JSON.parse(decompressed);
      if (data.expiry && Date.now() > data.expiry) {
        alert(t('share_expired'));
        window.location.hash = '';
        return;
      }
      if (data.originalText !== undefined) setOriginalText(data.originalText);
      if (data.modifiedText !== undefined) setModifiedText(data.modifiedText);
      if (data.settings) updateSettings(data.settings);
      window.location.hash = '';
    } catch (e) {
      // silently ignore
    }
  }, [isLoaded, setOriginalText, setModifiedText, updateSettings, t]);

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
      // ignore
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

  const handleShareWithExpiry = async (hours: number) => {
    const expiry = hours > 0 ? Date.now() + hours * 3600000 : 0;
    const LZString = (await import('lz-string')).default;
    const data = { originalText, modifiedText, settings, expiry };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
    const url = `${window.location.origin}${window.location.pathname}#${compressed}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Ignore clipboard permission errors; URL is still shown in the popover.
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMergeDecision = useCallback((rowIndex: number, decision: 'left' | 'right' | 'both' | 'discard') => {
    setMergeDecisions(prev => {
      const newMap = new Map(prev);
      newMap.set(rowIndex, decision);
      return newMap;
    });
  }, []);

  const mergedText = useMemo(() => {
    if (!diffResult) return '';
    return generateMergedText(diffResult.rows, mergeDecisions);
  }, [diffResult, mergeDecisions]);

  const handleDownloadMerged = () => {
    const blob = new Blob([mergedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setFullscreen(false);
    } else {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyDiff, originalText, modifiedText, originalHistory, modifiedHistory]);

  if (!isLoaded) return null;

  // Command palette actions
  const commandActions = [
    { id: 'clear', label: t('clear'), onSelect: () => handleCopyDiff() },
    { id: 'swap', label: t('swap'), onSelect: () => { const temp = originalText; originalHistory.reset(modifiedText); modifiedHistory.reset(temp); } },
    { id: 'word-diff', label: t('word_diff'), onSelect: () => updateSettings({ wordLevelDiff: !settings.wordLevelDiff }) },
    { id: 'split-view', label: t('split'), onSelect: () => updateSettings({ viewMode: 'split' }) },
    { id: 'unified-view', label: t('unified'), onSelect: () => updateSettings({ viewMode: 'unified' }) },
    { id: 'inline-view', label: t('inline'), onSelect: () => updateSettings({ viewMode: 'inline' }) },
    { id: 'fullscreen', label: fullscreen ? t('exit_fullscreen') : t('fullscreen'), onSelect: toggleFullscreen },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-base sm:text-xl font-semibold tracking-tight truncate">{t('app_title')}</h1>
            {isSaved && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full animate-in fade-in duration-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                {t('saved')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="h-9 w-9" />}>
                <Globe className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {['en','ar','es','fr','de','ru','ku','zh'].map((lng) => (
                  <DropdownMenuItem key={lng} onClick={() => setLanguage(lng as any)}>
                    {lng.toUpperCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ShortcutsPopover />
            <FullscreenToggle fullscreen={fullscreen} onToggle={toggleFullscreen} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8">
        <DiffEditor />

        {diffResult && (diffResult.addedLinesCount > 0 || diffResult.removedLinesCount > 0 || diffResult.unchangedLinesCount > 0) && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DiffToolbar
              onCopy={handleCopyDiff}
              onExportTxt={handleExportText}
              onExportJson={handleExportJSON}
              diffResult={diffResult}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              syncScroll={syncScroll}
              onSyncScrollChange={setSyncScroll}
              showMinimap={showMinimap}
              onToggleMinimap={() => setShowMinimap(!showMinimap)}
              mergeMode={mergeMode}
              onToggleMergeMode={() => setMergeMode(!mergeMode)}
              onPrint={handlePrint}
              onShareWithExpiry={handleShareWithExpiry}
              shareUrl={shareUrl}
              stats={stats}
              reorderDetection={reorderDetection}
              onReorderDetectionChange={setReorderDetection}
              similarityHeatmap={similarityHeatmap}
              onSimilarityHeatmapChange={setSimilarityHeatmap}
            />

            <DiffViewer
              onResult={setDiffResult}
              searchQuery={searchQuery}
              syncScroll={syncScroll}
              showMinimap={showMinimap}
              mergeMode={mergeMode}
              mergeDecisions={mergeDecisions}
              onMergeDecision={handleMergeDecision}
              reorderDetection={reorderDetection}
              similarityHeatmap={similarityHeatmap}
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

            {mergeMode && (
              <div className="mt-4 border border-border rounded-xl p-4 bg-card shadow-sm no-print">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{t('merged_result')}</h3>
                  <Button variant="outline" size="sm" onClick={handleDownloadMerged}>
                    <Download className="w-4 h-4 me-2" /> {t('download_merged')}
                  </Button>
                </div>
                <textarea
                  value={mergedText}
                  readOnly
                  className="w-full h-64 bg-muted/30 rounded-lg p-4 font-mono text-sm resize-y border border-border"
                />
              </div>
            )}
          </div>
        )}

        {(!diffResult || (diffResult.addedLinesCount === 0 && diffResult.removedLinesCount === 0 && diffResult.unchangedLinesCount === 0)) && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-in fade-in duration-500 border-2 border-dashed border-border/50 rounded-xl bg-muted/10 no-print">
            <FileJson className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">{t('empty_state_msg')}</p>
            <div className="hidden">
              <DiffViewer
                onResult={setDiffResult}
                searchQuery=""
                syncScroll={false}
                showMinimap={false}
                mergeMode={false}
                mergeDecisions={new Map()}
                onMergeDecision={() => {}}
              />
            </div>
          </div>
        )}
      </main>

      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} actions={commandActions} />
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
