"use client";

import React, { useState } from 'react';
import { useDiffContext } from './diff-context';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings2, Download, Copy, Check, Type, Hash, SplitSquareHorizontal, AlignLeft, ChevronUp, ChevronDown, Search, Share2, Lock, Minus, Merge, Printer, BarChart2, FileText, FileDown, FileCode2, Eye, GitBranch, Maximize2, Minimize2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/components/i18n/language-context';
import { Input } from '@/components/ui/input';
import { DiffStatsPopover } from './diff-stats-popover';
import { QrCodeButton } from '../share/qr-code-button';
import { ShareExpiryPopover } from '../share/share-expiry-popover';
import { PresetManager } from '../preset-manager';
import { generateStyledHTML, generateMarkdownDiff } from '@/lib/export-utils';

interface DiffToolbarProps {
  onCopy: () => void;
  onExportTxt: () => void;
  onExportJson: () => void;
  diffResult?: any;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  syncScroll: boolean;
  onSyncScrollChange: (sync: boolean) => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  mergeMode: boolean;
  onToggleMergeMode: () => void;
  onPrint: () => void;
  onShareWithExpiry: (hours: number) => Promise<void>;
  shareUrl: string;
  stats: any;
  reorderDetection: boolean;
  onReorderDetectionChange: (val: boolean) => void;
  similarityHeatmap: boolean;
  onSimilarityHeatmapChange: (val: boolean) => void;
}

export function DiffToolbar({
  onCopy,
  onExportTxt,
  onExportJson,
  diffResult,
  searchQuery,
  onSearchChange,
  syncScroll,
  onSyncScrollChange,
  showMinimap,
  onToggleMinimap,
  mergeMode,
  onToggleMergeMode,
  onPrint,
  onShareWithExpiry,
  shareUrl,
  stats,
  reorderDetection,
  onReorderDetectionChange,
  similarityHeatmap,
  onSimilarityHeatmapChange,
}: DiffToolbarProps) {
  const { settings, updateSettings } = useDiffContext();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToDiff = (direction: 'next' | 'prev') => {
    const changes = Array.from(document.querySelectorAll('.diff-change'));
    if (changes.length === 0) return;
    const headerOffset = 150;
    let targetIndex = -1;
    if (direction === 'next') {
      targetIndex = changes.findIndex(el => el.getBoundingClientRect().top > headerOffset + 10);
      if (targetIndex === -1) targetIndex = 0;
    } else {
      for (let i = changes.length - 1; i >= 0; i--) {
        if (changes[i].getBoundingClientRect().top < headerOffset - 10) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex === -1) targetIndex = changes.length - 1;
    }
    if (targetIndex !== -1 && changes[targetIndex]) {
      const rect = changes[targetIndex].getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top - headerOffset, behavior: 'smooth' });
    }
  };

  const handleExportHTML = () => {
    if (!diffResult?.rows) return;
    const html = generateStyledHTML(diffResult.rows, settings.colors);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMD = () => {
    if (!diffResult?.rows) return;
    const md = generateMarkdownDiff(diffResult.rows);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sticky top-16 z-20 flex flex-col gap-3 p-3 rounded-xl bg-card border border-border shadow-sm overflow-hidden diff-toolbar no-print">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto max-w-full pb-1 scrollbar-hide">
          <Select value={settings.language} onValueChange={(val) => updateSettings({ language: val as string })}>
            <SelectTrigger className="w-[140px] h-9 bg-muted/50 border-border hover:bg-muted transition-colors">
              <SelectValue placeholder={t('language')} />
            </SelectTrigger>
            <SelectContent>
              {['text','javascript','typescript','css','json','python','java','csharp','cpp','go','rust','sql','bash','yaml','markdown'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="sm" className="h-9 gap-2" onClick={onExportTxt} />}>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t('export_txt')}</span>
            </TooltipTrigger>
            <TooltipContent>{t('export_txt')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="sm" className="h-9 gap-2" onClick={onExportJson} />}>
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">{t('export_json')}</span>
            </TooltipTrigger>
            <TooltipContent>{t('export_json')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="sm" className="h-9 gap-2" onClick={handleExportHTML} />}>
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{t('export_html')}</span>
            </TooltipTrigger>
            <TooltipContent>{t('export_html')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="sm" className="h-9 gap-2" onClick={handleExportMD} />}>
              <FileCode2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('export_markdown')}</span>
            </TooltipTrigger>
            <TooltipContent>{t('export_markdown')}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="w-32 sm:w-40 h-9 pl-8 pr-2 text-sm"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {diffResult && (
            <div className="flex items-center gap-4 text-sm px-2 mr-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="font-medium text-foreground">{diffResult.addedLinesCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="font-medium text-foreground">{diffResult.removedLinesCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30"></span>
                <span className="font-medium text-foreground">{diffResult.unchangedLinesCount}</span>
              </div>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollToDiff('prev')} />}>
                    <ChevronUp className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent>{t('prev_diff')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollToDiff('next')} />}>
                    <ChevronDown className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent>{t('next_diff')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          <ShareExpiryPopover onShare={onShareWithExpiry} shareUrl={shareUrl}>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                <Share2 className="w-4 h-4" />
              </TooltipTrigger>
              <TooltipContent>{t('share_link')}</TooltipContent>
            </Tooltip>
          </ShareExpiryPopover>

          <QrCodeButton url={shareUrl} />

          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="sm" className="h-9 gap-2" onClick={handleCopy} />}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? t('copied') : t('copy_diff')}</span>
            </TooltipTrigger>
            <TooltipContent>{t('copy_diff')} (Alt+C)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto max-w-full pb-1 scrollbar-hide">
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
            <Tooltip>
              <TooltipTrigger render={<Button variant={settings.wordLevelDiff ? 'default' : 'ghost'} size="sm" className="h-7 px-2 gap-2" onClick={() => updateSettings({ wordLevelDiff: !settings.wordLevelDiff })} />}>
                <Type className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('word_diff')}</span>
              </TooltipTrigger>
              <TooltipContent>{t('word_diff')}</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
            <Tooltip>
              <TooltipTrigger render={<Button variant={settings.showLineNumbers ? 'default' : 'ghost'} size="sm" className="h-7 px-2 gap-2" onClick={() => updateSettings({ showLineNumbers: !settings.showLineNumbers })} />}>
                <Hash className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('numbers')}</span>
              </TooltipTrigger>
              <TooltipContent>{t('numbers')}</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
            <Button
              variant={settings.viewMode === 'split' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 gap-2"
              onClick={() => updateSettings({ viewMode: 'split' })}
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('split')}</span>
            </Button>
            <Button
              variant={settings.viewMode === 'unified' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 gap-2"
              onClick={() => updateSettings({ viewMode: 'unified' })}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('unified')}</span>
            </Button>
            <Button
              variant={settings.viewMode === 'inline' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 gap-2"
              onClick={() => updateSettings({ viewMode: 'inline' })}
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('inline')}</span>
            </Button>
          </div>

          {settings.viewMode === 'split' && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant={syncScroll ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 gap-2"
                    onClick={() => onSyncScrollChange(!syncScroll)}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('scroll_sync')}</span>
                  </Button>
                }
              />
              <TooltipContent>{t('scroll_sync')}</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant={showMinimap ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 gap-2"
                onClick={onToggleMinimap}
              >
                <Minus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('minimap')}</span>
              </Button>
            }/>
            <TooltipContent>{t('minimap')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant={mergeMode ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 gap-2"
                onClick={onToggleMergeMode}
              >
                <Merge className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('merge_mode')}</span>
              </Button>
            }/>
            <TooltipContent>{t('merge_mode')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant={reorderDetection ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 gap-2"
                onClick={() => onReorderDetectionChange(!reorderDetection)}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('reorder_detection')}</span>
              </Button>
            }/>
            <TooltipContent>{t('reorder_detection')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant={similarityHeatmap ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 gap-2"
                onClick={() => onSimilarityHeatmapChange(!similarityHeatmap)}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('similarity_heatmap')}</span>
              </Button>
            }/>
            <TooltipContent>{t('similarity_heatmap')}</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="icon" className="h-9 w-9" onClick={onPrint} />}>
              <Printer className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent>{t('print')}</TooltipContent>
          </Tooltip>

          {stats && <DiffStatsPopover stats={stats} />}

          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="icon" className="h-9 w-9" />}>
              <Settings2 className="w-4 h-4" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
              <div className="flex flex-col gap-6 text-[13px]">
                <div className="space-y-1">
                  <h4 className="font-semibold leading-none">{t('diff_settings')}</h4>
                  <p className="text-xs text-muted-foreground">{t('diff_settings_desc')}</p>
                </div>
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('diff_options')}</h5>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="word-level-diff" className="flex-1 cursor-pointer text-[13px]">{t('word_diff')}</Label>
                      <Switch id="word-level-diff" checked={settings.wordLevelDiff} onCheckedChange={(c) => updateSettings({ wordLevelDiff: c })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ignore-whitespace" className="flex-1 cursor-pointer text-[13px]">{t('ignore_whitespace')}</Label>
                      <Switch id="ignore-whitespace" checked={settings.ignoreWhitespace} onCheckedChange={(c) => updateSettings({ ignoreWhitespace: c })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ignore-case" className="flex-1 cursor-pointer text-[13px]">{t('ignore_case')}</Label>
                      <Switch id="ignore-case" checked={settings.ignoreCase} onCheckedChange={(c) => updateSettings({ ignoreCase: c })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="collapse-unchanged" className="flex-1 cursor-pointer text-[13px]">{t('collapse_unchanged')}</Label>
                      <Switch id="collapse-unchanged" checked={settings.collapseUnchanged} onCheckedChange={(c) => updateSettings({ collapseUnchanged: c })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="word-wrap" className="flex-1 cursor-pointer text-[13px]">{t('word_wrap')}</Label>
                      <Switch id="word-wrap" checked={settings.wordWrap} onCheckedChange={(c) => updateSettings({ wordWrap: c })} />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('syntax_highlighting')}</h5>
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-[13px]">{t('syntax_theme')}</Label>
                    <Select value={settings.syntaxTheme} onValueChange={(v) => updateSettings({ syntaxTheme: v })}>
                      <SelectTrigger className="h-9 bg-muted/50 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="github">GitHub (Default)</SelectItem>
                        <SelectItem value="dracula">Dracula</SelectItem>
                        <SelectItem value="prism">Prism Standard</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('color_customization')}</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t('added_bg')}</Label>
                      <div className="flex items-center gap-2 p-1 border border-border rounded-md bg-muted/30">
                        <input type="color" value={settings.colors.addedBg.slice(0, 7)} onChange={(e) => updateSettings({ colors: { ...settings.colors, addedBg: e.target.value + '33' } })} className="w-6 h-6 p-0 border-0 rounded cursor-pointer" />
                        <span className="text-xs font-mono text-muted-foreground flex-1 text-center">{settings.colors.addedBg.slice(0, 7)}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t('added_text')}</Label>
                      <div className="flex items-center gap-2 p-1 border border-border rounded-md bg-muted/30">
                        <input type="color" value={settings.colors.addedText.slice(0, 7)} onChange={(e) => updateSettings({ colors: { ...settings.colors, addedText: e.target.value } })} className="w-6 h-6 p-0 border-0 rounded cursor-pointer" />
                        <span className="text-xs font-mono text-muted-foreground flex-1 text-center">{settings.colors.addedText.slice(0, 7)}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t('removed_bg')}</Label>
                      <div className="flex items-center gap-2 p-1 border border-border rounded-md bg-muted/30">
                        <input type="color" value={settings.colors.removedBg.slice(0, 7)} onChange={(e) => updateSettings({ colors: { ...settings.colors, removedBg: e.target.value + '33' } })} className="w-6 h-6 p-0 border-0 rounded cursor-pointer" />
                        <span className="text-xs font-mono text-muted-foreground flex-1 text-center">{settings.colors.removedBg.slice(0, 7)}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t('removed_text')}</Label>
                      <div className="flex items-center gap-2 p-1 border border-border rounded-md bg-muted/30">
                        <input type="color" value={settings.colors.removedText.slice(0, 7)} onChange={(e) => updateSettings({ colors: { ...settings.colors, removedText: e.target.value } })} className="w-6 h-6 p-0 border-0 rounded cursor-pointer" />
                        <span className="text-xs font-mono text-muted-foreground flex-1 text-center">{settings.colors.removedText.slice(0, 7)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator />
                <PresetManager />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
