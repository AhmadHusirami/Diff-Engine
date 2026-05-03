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
  const [isGistOpen, setIsGistOpen] = useState(false);
  const [gistUrl, setGistUrl] = useState('');

  const [dragOverOriginal, setDragOverOriginal] = useState(false);
  const [dragOverModified, setDragOverModified] = useState(false);

  const handleLoadUrl = async (url: string, setter: (val: string) => void, closePopover: () => void) => {
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const text = await res.text();
      setter(text);
      closePopover();
    } catch (e) {
      // silently fail
    }
  };

  const handleLoadGist = async (setter: (val: string) => void) => {
    try {
      const content = await fetchGistContent(gistUrl);
      setter(content);
      setIsGistOpen(false);
    } catch (e) {
      // fail silently
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
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
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setOriginalText(ev.target?.result as string);
      };
      reader.readAsText(files[0]);
    }
  };

  const handleDropModified = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverModified(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setModifiedText(ev.target?.result as string);
      };
      reader.readAsText(files[0]);
    }
  };

  const formatJSON = (text: string, setter: (val: string) => void) => {
    try {
      const parsed = JSON.parse(text);
      setter(JSON.stringify(parsed, null, 2));
    } catch {
      // Not valid JSON – ignore
    }
  };

  const handleTextAction = (action: string, text: string, setter: (val: string) => void) => {
    let result = text;
    switch (action) {
      case 'sort':
        result = text.split('\n').sort().join('\n');
        break;
      case 'trim':
        result = text.split('\n').map(line => line.trim()).join('\n');
        break;
      case 'remove_empty':
        result = text.split('\n').filter(line => line.trim() !== '').join('\n');
        break;
      case 'lowercase':
        result = text.toLowerCase();
        break;
      case 'uppercase':
        result = text.toUpperCase();
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
        {/* Original Text Panel */}
        <Card
          className={`flex flex-col overflow-hidden border-border shadow-sm rounded-xl ${dragOverOriginal ? 'ring-2 ring-primary' : ''}`}
          onDragOver={(e) => { handleDragOver(e); setDragOverOriginal(true); }}
          onDragLeave={() => setDragOverOriginal(false)}
          onDrop={(e) => { handleDropOriginal(e); }}
        >
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">{t('original_text')}</span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-full scrollbar-hide">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('text_actions')} />}>
                  <Wand2 className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleTextAction('sort', originalText, setOriginalText)}>{t('sort_lines')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTextAction('trim', originalText, setOriginalText)}>{t('trim_lines')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTextAction('remove_empty', originalText, setOriginalText)}>{t('remove_empty_lines')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTextAction('lowercase', originalText, setOriginalText)}>{t('lowercase')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTextAction('uppercase', originalText, setOriginalText)}>{t('uppercase')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => formatJSON(originalText, setOriginalText)}
                aria-label={t('format_json')}
              >
                <FileJson className="w-3.5 h-3.5" />
              </Button>
              <input
                type="file"
                accept=".txt,.json,.js,.ts,.html,.css,.md,.csv"
                className="hidden"
                ref={originalFileInputRef}
                onChange={(e) => handleFileUpload(e, setOriginalText)}
              />
              <Popover open={isOriginalUrlOpen} onOpenChange={setIsOriginalUrlOpen}>
                <PopoverTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('load_url')} />}>
                  <Link className="w-3.5 h-3.5" />
                </PopoverTrigger>
                <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={originalUrl}
                      onChange={(e) => setOriginalUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl(originalUrl, setOriginalText, () => setIsOriginalUrlOpen(false))}
                    />
                    <Button onClick={() => handleLoadUrl(originalUrl, setOriginalText, () => setIsOriginalUrlOpen(false))}>{t('load_url')}</Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover open={isGistOpen} onOpenChange={setIsGistOpen}>
                <PopoverTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('import_gist')} />}>
                  <GitBranch className="w-3.5 h-3.5" />
                </PopoverTrigger>
                <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Gist URL or ID"
                      value={gistUrl}
                      onChange={(e) => setGistUrl(e.target.value)}
                    />
                    <Button onClick={() => handleLoadGist(setOriginalText)}>{t('import_gist')}</Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => originalFileInputRef.current?.click()}
                aria-label={t('upload_file')}
              >
                <Upload className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={originalHistory.undo}
                disabled={!originalHistory.canUndo}
                aria-label={t('undo')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={originalHistory.redo}
                disabled={!originalHistory.canRedo}
                aria-label={t('redo')}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </Button>
            </div>
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

        {/* Modified Text Panel */}
        <Card
          className={`flex flex-col overflow-hidden border-border shadow-sm rounded-xl ${dragOverModified ? 'ring-2 ring-primary' : ''}`}
          onDragOver={(e) => { handleDragOver(e); setDragOverModified(true); }}
          onDragLeave={() => setDragOverModified(false)}
          onDrop={(e) => { handleDropModified(e); }}
        >
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">{t('modified_text')}</span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-full scrollbar-hide">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('text_actions')} />}>
                  <Wand2 className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleTextAction('sort', modifiedText, setModifiedText)}>{t('sort_lines')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTextAction('trim', modifiedText, setModifiedText)}>{t('trim_lines')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTextAction('remove_empty', modifiedText, setModifiedText)}>{t('remove_empty_lines')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTextAction('lowercase', modifiedText, setModifiedText)}>{t('lowercase')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTextAction('uppercase', modifiedText, setModifiedText)}>{t('uppercase')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => formatJSON(modifiedText, setModifiedText)}
                aria-label={t('format_json')}
              >
                <FileJson className="w-3.5 h-3.5" />
              </Button>
              <input
                type="file"
                accept=".txt,.json,.js,.ts,.html,.css,.md,.csv"
                className="hidden"
                ref={modifiedFileInputRef}
                onChange={(e) => handleFileUpload(e, setModifiedText)}
              />
              <Popover open={isModifiedUrlOpen} onOpenChange={setIsModifiedUrlOpen}>
                <PopoverTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('load_url')} />}>
                  <Link className="w-3.5 h-3.5" />
                </PopoverTrigger>
                <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={modifiedUrl}
                      onChange={(e) => setModifiedUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl(modifiedUrl, setModifiedText, () => setIsModifiedUrlOpen(false))}
                    />
                    <Button onClick={() => handleLoadUrl(modifiedUrl, setModifiedText, () => setIsModifiedUrlOpen(false))}>{t('load_url')}</Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover open={isGistOpen} onOpenChange={setIsGistOpen}>
                <PopoverTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('import_gist')} />}>
                  <GitBranch className="w-3.5 h-3.5" />
                </PopoverTrigger>
                <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Gist URL or ID"
                      value={gistUrl}
                      onChange={(e) => setGistUrl(e.target.value)}
                    />
                    <Button onClick={() => handleLoadGist(setModifiedText)}>{t('import_gist')}</Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => modifiedFileInputRef.current?.click()}
                aria-label={t('upload_file')}
              >
                <Upload className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={modifiedHistory.undo}
                disabled={!modifiedHistory.canUndo}
                aria-label={t('undo')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={modifiedHistory.redo}
                disabled={!modifiedHistory.canRedo}
                aria-label={t('redo')}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </Button>
            </div>
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

