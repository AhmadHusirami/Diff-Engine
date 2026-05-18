"use client";

import React, { useRef, useState } from 'react';
import { useDiffContext } from './diff-context';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, ArrowLeftRight, Trash2, Upload, FileJson, Wand2, Link, GitBranch } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/components/i18n/language-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { fetchGistContent } from '@/lib/gist-api';

type TextSetter = (val: string) => void;
type TextHistory = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

type PanelHeaderActionsProps = {
  text: string;
  setText: TextSetter;
  history: TextHistory;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  url: string;
  setUrl: React.Dispatch<React.SetStateAction<string>>;
  isUrlOpen: boolean;
  setIsUrlOpen: React.Dispatch<React.SetStateAction<boolean>>;
  gistUrl: string;
  setGistUrl: React.Dispatch<React.SetStateAction<string>>;
  isGistOpen: boolean;
  setIsGistOpen: React.Dispatch<React.SetStateAction<boolean>>;
  t: (key: string) => string;
  onTextAction: (action: string, text: string, setter: TextSetter) => void;
  onFormatJson: (text: string, setter: TextSetter) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, setter: TextSetter) => void;
  onLoadUrl: (url: string, setter: TextSetter, closePopover: () => void) => Promise<void>;
  onLoadGist: (gistUrl: string, setter: TextSetter, closePopover: () => void) => Promise<void>;
};

const headerIconButtonClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-sm transition-all outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50";

function HeaderIconButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={headerIconButtonClass}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function PanelHeaderActions({
  text,
  setText,
  history,
  fileInputRef,
  url,
  setUrl,
  isUrlOpen,
  setIsUrlOpen,
  gistUrl,
  setGistUrl,
  isGistOpen,
  setIsGistOpen,
  t,
  onTextAction,
  onFormatJson,
  onFileUpload,
  onLoadUrl,
  onLoadGist,
}: PanelHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto max-w-full scrollbar-hide touch-pan-x [&_button]:shrink-0 [&_button]:pointer-events-auto [&_button]:touch-manipulation">
      <DropdownMenu>
        <DropdownMenuTrigger className={headerIconButtonClass} aria-label={t('text_actions')}>
          <Wand2 className="w-3.5 h-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onTextAction('sort', text, setText)}>{t('sort_lines')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTextAction('trim', text, setText)}>{t('trim_lines')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTextAction('remove_empty', text, setText)}>{t('remove_empty_lines')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTextAction('lowercase', text, setText)}>{t('lowercase')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTextAction('uppercase', text, setText)}>{t('uppercase')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <HeaderIconButton
        onClick={() => onFormatJson(text, setText)}
        ariaLabel={t('format_json')}
      >
        <FileJson className="w-3.5 h-3.5" />
      </HeaderIconButton>

      <input
        type="file"
        accept=".txt,.json,.js,.ts,.html,.css,.md,.csv"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => onFileUpload(e, setText)}
      />

      <Popover open={isUrlOpen} onOpenChange={setIsUrlOpen}>
        <PopoverTrigger className={headerIconButtonClass} aria-label={t('load_url')}>
          <Link className="w-3.5 h-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-3">
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLoadUrl(url, setText, () => setIsUrlOpen(false))}
            />
            <Button onClick={() => onLoadUrl(url, setText, () => setIsUrlOpen(false))}>{t('load_url')}</Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={isGistOpen} onOpenChange={setIsGistOpen}>
        <PopoverTrigger className={headerIconButtonClass} aria-label={t('import_gist')}>
          <GitBranch className="w-3.5 h-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Gist URL or ID"
              value={gistUrl}
              onChange={(e) => setGistUrl(e.target.value)}
            />
            <Button onClick={() => onLoadGist(gistUrl, setText, () => setIsGistOpen(false))}>{t('import_gist')}</Button>
          </div>
        </PopoverContent>
      </Popover>

      <HeaderIconButton
        onClick={() => fileInputRef.current?.click()}
        ariaLabel={t('upload_file')}
      >
        <Upload className="w-3.5 h-3.5" />
      </HeaderIconButton>

      <HeaderIconButton
        onClick={history.undo}
        disabled={!history.canUndo}
        ariaLabel={t('undo')}
      >
        <Undo2 className="w-3.5 h-3.5" />
      </HeaderIconButton>

      <HeaderIconButton
        onClick={history.redo}
        disabled={!history.canRedo}
        ariaLabel={t('redo')}
      >
        <Redo2 className="w-3.5 h-3.5" />
      </HeaderIconButton>
    </div>
  );
}

export function DiffEditor() {
  const {
    originalText,
    setOriginalText,
    originalHistory,
    modifiedText,
    setModifiedText,
    modifiedHistory,
    settings,
  } = useDiffContext();
  const { t } = useLanguage();

  const originalFileInputRef = useRef<HTMLInputElement>(null);
  const modifiedFileInputRef = useRef<HTMLInputElement>(null);

  const [originalUrl, setOriginalUrl] = useState('');
  const [modifiedUrl, setModifiedUrl] = useState('');
  const [isOriginalUrlOpen, setIsOriginalUrlOpen] = useState(false);
  const [isModifiedUrlOpen, setIsModifiedUrlOpen] = useState(false);

  const [originalGistUrl, setOriginalGistUrl] = useState('');
  const [modifiedGistUrl, setModifiedGistUrl] = useState('');
  const [isOriginalGistOpen, setIsOriginalGistOpen] = useState(false);
  const [isModifiedGistOpen, setIsModifiedGistOpen] = useState(false);

  const [dragOverOriginal, setDragOverOriginal] = useState(false);
  const [dragOverModified, setDragOverModified] = useState(false);

  const handleLoadUrl = async (url: string, setter: TextSetter, closePopover: () => void) => {
    if (!url.trim()) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const text = await res.text();
      setter(text);
      closePopover();
    } catch {
      // silently fail
    }
  };

  const handleLoadGist = async (gistUrl: string, setter: TextSetter, closePopover: () => void) => {
    if (!gistUrl.trim()) return;
    try {
      const content = await fetchGistContent(gistUrl);
      setter(content);
      closePopover();
    } catch {
      // silently fail
    }
  };

  const handleClear = () => {
    setOriginalText('');
    setModifiedText('');
  };

  const handleSwap = () => {
    const temp = originalText;
    setOriginalText(modifiedText);
    setModifiedText(temp);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: TextSetter) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setter(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropOriginal = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverOriginal(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setOriginalText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleDropModified = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverModified(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setModifiedText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const formatJSON = (text: string, setter: TextSetter) => {
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      if (formatted !== text) setter(formatted);
    } catch {
      // Invalid JSON: no-op.
    }
  };

  const handleTextAction = (action: string, text: string, setter: TextSetter) => {
    let result = text;

    switch (action) {
      case 'sort':
        result = text.split('\n').sort().join('\n');
        break;
      case 'trim':
        result = text.split('\n').map((line) => line.trim()).join('\n');
        break;
      case 'remove_empty':
        result = text.split('\n').filter((line) => line.trim() !== '').join('\n');
        break;
      case 'lowercase':
        result = text.toLowerCase();
        break;
      case 'uppercase':
        result = text.toUpperCase();
        break;
      default:
        break;
    }

    setter(result);
  };

  const getStats = (text: string) => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split('\n').length : 0;
    return { chars, words, lines };
  };

  const originalStats = getStats(originalText);
  const modifiedStats = getStats(modifiedText);

  return (
    <div className="flex flex-col gap-4 no-print">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">{t('input_texts')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleClear} aria-label="Clear All (Alt+X)">
            <Trash2 className="w-4 h-4 me-2" />
            {t('clear')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSwap} aria-label="Swap (Alt+S)">
            <ArrowLeftRight className="w-4 h-4 me-2" />
            {t('swap')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className={`flex flex-col overflow-hidden border-border shadow-sm rounded-xl ${dragOverOriginal ? 'ring-2 ring-primary' : ''}`}
          onDragOver={(e) => {
            handleDragOver(e);
            setDragOverOriginal(true);
          }}
          onDragLeave={() => setDragOverOriginal(false)}
          onDrop={handleDropOriginal}
        >
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">{t('original_text')}</span>
            <PanelHeaderActions
              text={originalText}
              setText={setOriginalText}
              history={originalHistory}
              fileInputRef={originalFileInputRef}
              url={originalUrl}
              setUrl={setOriginalUrl}
              isUrlOpen={isOriginalUrlOpen}
              setIsUrlOpen={setIsOriginalUrlOpen}
              gistUrl={originalGistUrl}
              setGistUrl={setOriginalGistUrl}
              isGistOpen={isOriginalGistOpen}
              setIsGistOpen={setIsOriginalGistOpen}
              t={t}
              onTextAction={handleTextAction}
              onFormatJson={formatJSON}
              onFileUpload={handleFileUpload}
              onLoadUrl={handleLoadUrl}
              onLoadGist={handleLoadGist}
            />
          </div>

          {dragOverOriginal ? (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-primary rounded-b-xl m-2 bg-primary/5">
              <p className="text-sm text-muted-foreground">{t('drop_files_here')}</p>
            </div>
          ) : (
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder={t('paste_original')}
              className={`flex-1 min-h-[250px] p-4 bg-transparent resize-y font-mono text-sm focus:outline-none focus:bg-muted/10 transition-colors ${settings.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'}`}
            />
          )}

          <div className="px-4 py-1.5 bg-muted/30 border-t border-border text-xs text-muted-foreground flex justify-between">
            <span>{originalStats.lines} {t('lines')}</span>
            <span>{originalStats.words} {t('words')}</span>
            <span>{originalStats.chars} {t('chars')}</span>
          </div>
        </Card>

        <Card
          className={`flex flex-col overflow-hidden border-border shadow-sm rounded-xl ${dragOverModified ? 'ring-2 ring-primary' : ''}`}
          onDragOver={(e) => {
            handleDragOver(e);
            setDragOverModified(true);
          }}
          onDragLeave={() => setDragOverModified(false)}
          onDrop={handleDropModified}
        >
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">{t('modified_text')}</span>
            <PanelHeaderActions
              text={modifiedText}
              setText={setModifiedText}
              history={modifiedHistory}
              fileInputRef={modifiedFileInputRef}
              url={modifiedUrl}
              setUrl={setModifiedUrl}
              isUrlOpen={isModifiedUrlOpen}
              setIsUrlOpen={setIsModifiedUrlOpen}
              gistUrl={modifiedGistUrl}
              setGistUrl={setModifiedGistUrl}
              isGistOpen={isModifiedGistOpen}
              setIsGistOpen={setIsModifiedGistOpen}
              t={t}
              onTextAction={handleTextAction}
              onFormatJson={formatJSON}
              onFileUpload={handleFileUpload}
              onLoadUrl={handleLoadUrl}
              onLoadGist={handleLoadGist}
            />
          </div>

          {dragOverModified ? (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-primary rounded-b-xl m-2 bg-primary/5">
              <p className="text-sm text-muted-foreground">{t('drop_files_here')}</p>
            </div>
          ) : (
            <textarea
              value={modifiedText}
              onChange={(e) => setModifiedText(e.target.value)}
              placeholder={t('paste_modified')}
              className={`flex-1 min-h-[250px] p-4 bg-transparent resize-y font-mono text-sm focus:outline-none focus:bg-muted/10 transition-colors ${settings.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'}`}
            />
          )}

          <div className="px-4 py-1.5 bg-muted/30 border-t border-border text-xs text-muted-foreground flex justify-between">
            <span>{modifiedStats.lines} {t('lines')}</span>
            <span>{modifiedStats.words} {t('words')}</span>
            <span>{modifiedStats.chars} {t('chars')}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
