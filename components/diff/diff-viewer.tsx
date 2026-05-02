"use client";

import React, { useMemo, useDeferredValue, useEffect, useState, useRef } from 'react';
import * as Diff from 'diff';
import { Copy, Check, Pencil, ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import { useDiffContext } from './diff-context';
import { cn } from '@/lib/utils';
import { DiffMinimap } from './diff-minimap';
import { useLanguage } from '@/components/i18n/language-context';
import { detectMovedBlocks } from '@/lib/reorder-detection';

type SubToken = { value: string; added?: boolean; removed?: boolean };
type Token = { value: string; added?: boolean; removed?: boolean; subTokens?: SubToken[] };
export type Row = {
  left: { type: 'removed' | 'unchanged' | 'empty'; tokens: Token[]; lineNum?: number; moved?: boolean };
  right: { type: 'added' | 'unchanged' | 'empty'; tokens: Token[]; lineNum?: number; moved?: boolean };
};

function CopyLineButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/line:opacity-100 transition-opacity p-1 rounded hover:bg-muted/80 text-muted-foreground bg-background/50 backdrop-blur-sm border border-border/50"
      title="Copy line"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

interface DiffViewerProps {
  onResult: (res: any) => void;
  searchQuery: string;
  syncScroll: boolean;
  onEditOriginal?: (lineNum: number, newValue: string) => void;
  onEditModified?: (lineNum: number, newValue: string) => void;
  showMinimap: boolean;
  mergeMode: boolean;
  mergeDecisions: Map<number, 'left' | 'right' | 'both' | 'discard'>;
  onMergeDecision: (rowIndex: number, decision: 'left' | 'right' | 'both' | 'discard') => void;
  reorderDetection?: boolean;
  similarityHeatmap?: boolean;
}

export function DiffViewer({
  onResult,
  searchQuery,
  syncScroll,
  onEditOriginal,
  onEditModified,
  showMinimap,
  mergeMode,
  mergeDecisions,
  onMergeDecision,
  reorderDetection = false,
  similarityHeatmap = false,
}: DiffViewerProps) {
  const { originalText, modifiedText, settings } = useDiffContext();
  const { t } = useLanguage();
  const deferredOriginal = useDeferredValue(originalText);
  const deferredModified = useDeferredValue(modifiedText);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const [editing, setEditing] = useState<{ rowIndex: number; side: 'left' | 'right'; value: string } | null>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    const left = leftScrollRef.current;
    const right = rightScrollRef.current;
    if (!left || !right) return;

    const handleLeftScroll = () => {
      if (syncing.current) return;
      syncing.current = true;
      right.scrollTop = left.scrollTop;
      syncing.current = false;
    };
    const handleRightScroll = () => {
      if (syncing.current) return;
      syncing.current = true;
      left.scrollTop = right.scrollTop;
      syncing.current = false;
    };

    if (syncScroll) {
      left.addEventListener('scroll', handleLeftScroll);
      right.addEventListener('scroll', handleRightScroll);
    }

    return () => {
      left.removeEventListener('scroll', handleLeftScroll);
      right.removeEventListener('scroll', handleRightScroll);
    };
  }, [syncScroll]);

  const diffResult = useMemo(() => {
    if (!deferredOriginal && !deferredModified) {
      return { rows: [], addedLinesCount: 0, removedLinesCount: 0, unchangedLinesCount: 0 };
    }

    const options = {
      ignoreWhitespace: settings.ignoreWhitespace,
      ignoreCase: settings.ignoreCase,
    };

    const changes = Diff.diffLines(deferredOriginal, deferredModified, options);
    const rows: Row[] = [];
    let leftNum = 1;
    let rightNum = 1;
    let addedLinesCount = 0;
    let removedLinesCount = 0;
    let unchangedLinesCount = 0;

    const getLines = (text: string) => {
      if (!text) return [];
      const lines = text.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      return lines;
    };

    const getCharLevelTokens = (left: string, right: string) => {
      const charDiffs = Diff.diffChars(left, right, options);
      const leftTokens: Token[] = [];
      const rightTokens: Token[] = [];
      charDiffs.forEach(cd => {
        if (cd.added) {
          rightTokens.push({ value: cd.value, added: true });
        } else if (cd.removed) {
          leftTokens.push({ value: cd.value, removed: true });
        } else {
          leftTokens.push({ value: cd.value });
          rightTokens.push({ value: cd.value });
        }
      });
      return { leftTokens, rightTokens };
    };

    let i = 0;
    while (i < changes.length) {
      const change = changes[i];

      if (change.removed && i + 1 < changes.length && changes[i + 1].added) {
        const addedChange = changes[i + 1];
        const leftLines = getLines(change.value);
        const rightLines = getLines(addedChange.value);
        const max = Math.max(leftLines.length, rightLines.length);

        for (let j = 0; j < max; j++) {
          const leftText = leftLines[j];
          const rightText = rightLines[j];

          let leftTokens: Token[] = [];
          let rightTokens: Token[] = [];

          if (leftText !== undefined && rightText !== undefined) {
            if (settings.wordLevelDiff) {
              const wd = Diff.diffWordsWithSpace(leftText, rightText, options);
              const pairedTokens: { left?: Token; right?: Token }[] = [];
              let currentPair: { left?: Token; right?: Token } = {};

              wd.forEach((part) => {
                if (part.removed) {
                  if (currentPair.right) {
                    pairedTokens.push(currentPair);
                    currentPair = {};
                  }
                  currentPair.left = { value: part.value, removed: true };
                } else if (part.added) {
                  if (currentPair.right) {
                    pairedTokens.push(currentPair);
                    currentPair = {};
                  }
                  currentPair.right = { value: part.value, added: true };
                } else {
                  if (currentPair.left || currentPair.right) {
                    pairedTokens.push(currentPair);
                    currentPair = {};
                  }
                  pairedTokens.push({ left: { value: part.value }, right: { value: part.value } });
                }
              });
              if (currentPair.left || currentPair.right) pairedTokens.push(currentPair);

              pairedTokens.forEach((pair) => {
                if (pair.left && pair.right && pair.left.removed && pair.right.added) {
                  const { leftTokens: lt, rightTokens: rt } = getCharLevelTokens(pair.left.value, pair.right.value);
                  pair.left = { ...pair.left, subTokens: lt.map(t => ({ value: t.value, removed: t.removed })) };
                  pair.right = { ...pair.right, subTokens: rt.map(t => ({ value: t.value, added: t.added })) };
                }
                if (pair.left) leftTokens.push(pair.left);
                if (pair.right) rightTokens.push(pair.right);
              });
            } else {
              leftTokens = [{ value: leftText, removed: true }];
              rightTokens = [{ value: rightText, added: true }];
            }
          } else {
            if (leftText !== undefined) leftTokens = [{ value: leftText, removed: true }];
            if (rightText !== undefined) rightTokens = [{ value: rightText, added: true }];
          }

          rows.push({
            left: leftText !== undefined
              ? { type: 'removed', tokens: leftTokens, lineNum: leftNum++ }
              : { type: 'empty', tokens: [] },
            right: rightText !== undefined
              ? { type: 'added', tokens: rightTokens, lineNum: rightNum++ }
              : { type: 'empty', tokens: [] },
          });
        }
        removedLinesCount += leftLines.length;
        addedLinesCount += rightLines.length;
        i += 2;
      } else if (change.removed) {
        const leftLines = getLines(change.value);
        leftLines.forEach((l) => {
          rows.push({
            left: { type: 'removed', tokens: [{ value: l, removed: true }], lineNum: leftNum++ },
            right: { type: 'empty', tokens: [] },
          });
        });
        removedLinesCount += leftLines.length;
        i++;
      } else if (change.added) {
        const rightLines = getLines(change.value);
        rightLines.forEach((l) => {
          rows.push({
            left: { type: 'empty', tokens: [] },
            right: { type: 'added', tokens: [{ value: l, added: true }], lineNum: rightNum++ },
          });
        });
        addedLinesCount += rightLines.length;
        i++;
      } else {
        const lines = getLines(change.value);
        lines.forEach((l) => {
          rows.push({
            left: { type: 'unchanged', tokens: [{ value: l }], lineNum: leftNum++ },
            right: { type: 'unchanged', tokens: [{ value: l }], lineNum: rightNum++ },
          });
        });
        unchangedLinesCount += lines.length;
        i++;
      }
    }

    let finalRows: Row[] = rows;
    if (reorderDetection) {
      finalRows = detectMovedBlocks(rows);
    }
    return { rows: finalRows, addedLinesCount, removedLinesCount, unchangedLinesCount };
  }, [deferredOriginal, deferredModified, settings, reorderDetection]);

  const rowsToRender = useMemo(() => {
    if (!settings.collapseUnchanged) return diffResult.rows as (Row | { type: 'collapsed_placeholder'; count: number })[];
    const collapsedRows: (Row | { type: 'collapsed_placeholder'; count: number })[] = [];
    let unchangedCount = 0;
    const CONTEXT_LINES = 3;

    for (let i = 0; i < diffResult.rows.length; i++) {
      const row = diffResult.rows[i];
      const isUnchanged = row.left.type === 'unchanged' && row.right.type === 'unchanged';

      if (isUnchanged) {
        unchangedCount++;
        if (
          (i < CONTEXT_LINES) ||
          (i > diffResult.rows.length - 1 - CONTEXT_LINES) ||
          (diffResult.rows.slice(Math.max(0, i - CONTEXT_LINES), i).some((r: any) => r.left.type !== 'unchanged' || r.right.type !== 'unchanged')) ||
          (diffResult.rows.slice(i + 1, i + 1 + CONTEXT_LINES).some((r: any) => r.left.type !== 'unchanged' || r.right.type !== 'unchanged'))
        ) {
          if (collapsedStartIdx !== -1) {
            collapsedRows.push({ type: 'collapsed_placeholder', count: unchangedCount - 1 - CONTEXT_LINES });
            collapsedStartIdx = -1;
          }
          collapsedRows.push(row);
        } else if (unchangedCount === CONTEXT_LINES + 1) {
          collapsedStartIdx = i;
        }
      } else {
        if (collapsedStartIdx !== -1) {
          collapsedRows.push({ type: 'collapsed_placeholder', count: unchangedCount - CONTEXT_LINES });
          collapsedStartIdx = -1;
        }
        unchangedCount = 0;
        collapsedRows.push(row);
      }
    }
    return collapsedRows;
  }, [diffResult.rows, settings.collapseUnchanged]);

  useEffect(() => {
    onResult(diffResult);
  }, [diffResult, onResult]);

  const highlightText = (text: string) => {
    if (!settings.language || settings.language === 'text' || searchQuery) return text;
    try {
      if (Prism.languages[settings.language]) {
        return Prism.highlight(text, Prism.languages[settings.language], settings.language);
      }
    } catch (e) {}
    return text;
  };

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlightSearchMatches = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi'));
    return (
      <>
        {parts.map((part, idx) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={idx} className="bg-yellow-300 dark:bg-yellow-500/50 rounded px-0.5">{part}</mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (!diffResult.rows.length) return null;

  const getAddedStyle = () => ({ backgroundColor: settings.colors.addedBg, color: settings.colors.addedText });
  const getRemovedStyle = () => ({ backgroundColor: settings.colors.removedBg, color: settings.colors.removedText });
  const getAddedWordStyle = () => ({ backgroundColor: settings.colors.addedText + '40', color: settings.colors.addedText });
  const getRemovedWordStyle = () => ({ backgroundColor: settings.colors.removedText + '40', color: settings.colors.removedText, textDecorationColor: settings.colors.removedText });
  const getMovedStyle = () => ({ backgroundColor: '#fef3c7', borderLeft: '3px solid #f59e0b' });

  const renderLine = (tokens: Token[], isRemoved: boolean, isAdded: boolean, isMoved?: boolean) => {
    return tokens.map((token, i) => {
      const wordStyle = isRemoved ? getRemovedWordStyle() : isAdded ? getAddedWordStyle() : {};
      if (isMoved) {
        Object.assign(wordStyle, { backgroundColor: '#fef3c7' });
      }
      if (token.subTokens && token.subTokens.length > 0) {
        return (
          <span key={i} className="relative">
            {token.subTokens.map((st, si) => (
              <span
                key={si}
                className={cn(st.removed && 'line-through')}
                style={st.removed ? getRemovedWordStyle() : st.added ? getAddedWordStyle() : {}}
              >
                {searchQuery ? highlightSearchMatches(st.value) : st.value}
              </span>
            ))}
          </span>
        );
      }
      return (
        <span
          key={i}
          className={cn(
            token.removed && 'line-through rounded-sm px-0.5 animate-in fade-in zoom-in-95 duration-500',
            token.added && 'rounded-sm px-0.5 animate-in fade-in zoom-in-95 duration-500',
            isMoved && 'bg-amber-100 dark:bg-amber-900/30'
          )}
          style={token.removed ? getRemovedWordStyle() : token.added ? getAddedWordStyle() : isMoved ? getMovedStyle() : {}}
        >
          {searchQuery
            ? highlightSearchMatches(token.value)
            : <span dangerouslySetInnerHTML={{ __html: highlightText(token.value) }} />
          }
        </span>
      );
    });
  };

  const startEditing = (rowIndex: number, side: 'left' | 'right', currentText: string) => {
    setEditing({ rowIndex, side, value: currentText });
  };

  const saveEdit = () => {
    if (!editing) return;
    const row = diffResult.rows[editing.rowIndex];
    if (!row) return;
    const lineNum = editing.side === 'left' ? row.left.lineNum : row.right.lineNum;
    if (lineNum === undefined) return;
    if (editing.side === 'left' && onEditOriginal) {
      onEditOriginal(lineNum, editing.value);
    } else if (editing.side === 'right' && onEditModified) {
      onEditModified(lineNum, editing.value);
    }
    setEditing(null);
  };

  const handleScrollToIndex = (index: number) => {
    const scrollContainer = settings.viewMode === 'split' ? leftScrollRef.current : null;
    if (scrollContainer) {
      const children = scrollContainer.children;
      if (children[index]) {
        children[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent, rowIndex: number) => {
    if (!mergeMode) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) onMergeDecision(rowIndex, 'right');
      else onMergeDecision(rowIndex, 'left');
    }
  };

  return (
    <div className="flex gap-1 printable-diff">
      <div className={cn(
        "rounded-xl border border-border bg-card shadow-sm overflow-hidden font-mono text-sm leading-relaxed flex-1",
        `theme-${settings.syntaxTheme}`
      )}>
        {settings.viewMode === 'split' && (
          <div className="flex w-full min-w-[600px] md:min-w-full" style={{ height: 'calc(100vh - 16rem)', minHeight: '400px' }}>
            <div ref={leftScrollRef} className="flex-1 overflow-y-auto border-e border-border diff-pane">
              {rowsToRender.map((row, idx) => {
                if ('type' in row) {
                  return <div key={`col-${idx}`} className="flex w-full border-b border-border/50 last:border-0 bg-muted/10 py-2 justify-center text-xs text-muted-foreground">... {row.count} collapsed unchanged lines ...</div>;
                }
                const left = row.left;
                const right = row.right;
                const isEditing = editing?.rowIndex === idx && editing.side === 'left';
                const decision = mergeDecisions.get(idx);
                const showMerge = mergeMode && (left.type !== 'unchanged' || right.type !== 'unchanged');
                const isMoved = left.moved || right.moved;
                return (
                  <div
                    key={idx}
                    className={cn("flex border-b border-border/50 last:border-0 transition-colors duration-200 relative group/line", left.type !== 'unchanged' && "diff-change")}
                    style={isMoved ? getMovedStyle() : (left.type === 'removed' ? getRemovedStyle() : {})}
                    onDoubleClick={() => {
                      if (!mergeMode && onEditOriginal && left.lineNum !== undefined && left.type !== 'empty') {
                        startEditing(idx, 'left', left.tokens.map(t => t.value).join(''));
                      }
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={(e) => handleTouchEnd(e, idx)}
                  >
                    {settings.showLineNumbers && (
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30 group-hover:bg-muted/60 transition-colors duration-200">
                        {left.lineNum || '\u00A0'}
                      </div>
                    )}
                    <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                      {left.type === 'empty' ? null : isEditing ? (
                        <input autoFocus value={editing!.value} onChange={(e) => setEditing({ ...editing!, value: e.target.value })} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} className="w-full bg-transparent border-b border-ring focus:outline-none" />
                      ) : (
                        renderLine(left.tokens, left.type === 'removed', false, isMoved)
                      )}
                    </div>
                    {left.type !== 'empty' && !isEditing && !mergeMode && (
                      <CopyLineButton text={left.tokens.map(t => t.value).join('')} />
                    )}
                    {onEditOriginal && left.type !== 'empty' && !isEditing && !mergeMode && (
                      <button onClick={() => startEditing(idx, 'left', left.tokens.map(t => t.value).join(''))} className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/line:opacity-100 transition-opacity p-1 rounded hover:bg-muted/80">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {showMerge && left.type !== 'empty' && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity">
                        <button onClick={() => onMergeDecision(idx, 'left')} className={`p-1 rounded ${decision === 'left' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/80'}`} title={t('accept_left')}><ArrowLeft className="w-3 h-3" /></button>
                        {right.type !== 'empty' && (
                          <button onClick={() => onMergeDecision(idx, 'right')} className={`p-1 rounded ${decision === 'right' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/80'}`} title={t('accept_right')}><ArrowRight className="w-3 h-3" /></button>
                        )}
                        <button onClick={() => onMergeDecision(idx, 'both')} className={`p-1 rounded ${decision === 'both' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/80'}`} title={t('keep_both')}><Plus className="w-3 h-3" /></button>
                        <button onClick={() => onMergeDecision(idx, 'discard')} className={`p-1 rounded ${decision === 'discard' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/80'}`} title={t('discard')}><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div ref={rightScrollRef} className="flex-1 overflow-y-auto diff-pane">
              {rowsToRender.map((row, idx) => {
                if ('type' in row) {
                  return <div key={`col-${idx}`} className="flex w-full border-b border-border/50 last:border-0 bg-muted/10 py-2 justify-center text-xs text-muted-foreground">... {row.count} collapsed unchanged lines ...</div>;
                }
                const left = row.left;
                const right = row.right;
                const isEditing = editing?.rowIndex === idx && editing.side === 'right';
                const decision = mergeDecisions.get(idx);
                const showMerge = mergeMode && (left.type !== 'unchanged' || right.type !== 'unchanged');
                const isMoved = left.moved || right.moved;
                return (
                  <div
                    key={idx}
                    className={cn("flex border-b border-border/50 last:border-0 transition-colors duration-200 relative group/line", right.type !== 'unchanged' && "diff-change")}
                    style={isMoved ? getMovedStyle() : (right.type === 'added' ? getAddedStyle() : {})}
                    onDoubleClick={() => {
                      if (!mergeMode && onEditModified && right.lineNum !== undefined && right.type !== 'empty') {
                        startEditing(idx, 'right', right.tokens.map(t => t.value).join(''));
                      }
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={(e) => handleTouchEnd(e, idx)}
                  >
                    {settings.showLineNumbers && (
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30 group-hover:bg-muted/60 transition-colors duration-200">
                        {right.lineNum || '\u00A0'}
                      </div>
                    )}
                    <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                      {right.type === 'empty' ? null : isEditing ? (
                        <input autoFocus value={editing!.value} onChange={(e) => setEditing({ ...editing!, value: e.target.value })} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} className="w-full bg-transparent border-b border-ring focus:outline-none" />
                      ) : (
                        renderLine(right.tokens, false, right.type === 'added', isMoved)
                      )}
                    </div>
                    {right.type !== 'empty' && !isEditing && !mergeMode && (
                      <CopyLineButton text={right.tokens.map(t => t.value).join('')} />
                    )}
                    {onEditModified && right.type !== 'empty' && !isEditing && !mergeMode && (
                      <button onClick={() => startEditing(idx, 'right', right.tokens.map(t => t.value).join(''))} className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/line:opacity-100 transition-opacity p-1 rounded hover:bg-muted/80">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {showMerge && right.type !== 'empty' && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity">
                        <button onClick={() => onMergeDecision(idx, 'left')} className={`p-1 rounded ${decision === 'left' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/80'}`} title={t('accept_left')}><ArrowLeft className="w-3 h-3" /></button>
                        <button onClick={() => onMergeDecision(idx, 'right')} className={`p-1 rounded ${decision === 'right' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/80'}`} title={t('accept_right')}><ArrowRight className="w-3 h-3" /></button>
                        <button onClick={() => onMergeDecision(idx, 'both')} className={`p-1 rounded ${decision === 'both' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/80'}`} title={t('keep_both')}><Plus className="w-3 h-3" /></button>
                        <button onClick={() => onMergeDecision(idx, 'discard')} className={`p-1 rounded ${decision === 'discard' ? 'bg-primary/20 text-primary' : 'hover:bg-muted/80'}`} title={t('discard')}><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {settings.viewMode === 'unified' && (
          <div className="flex flex-col w-full">
            {rowsToRender.map((row, idx) => {
              if ('type' in row) return <div key={`uni-${idx}`} className="flex w-full border-b border-border/50 last:border-0 bg-muted/10 py-2 justify-center text-xs text-muted-foreground">... {row.count} collapsed unchanged lines ...</div>;
              const left = row.left;
              const right = row.right;
              const isMoved = left.moved || right.moved;
              return (
                <div key={`uni-${idx}`}>
                  {left.type === 'removed' && (
                    <div className="flex border-b border-border/50 last:border-0 transition-colors duration-200 relative group/line diff-change" style={isMoved ? getMovedStyle() : getRemovedStyle()}>
                      {settings.showLineNumbers && (
                        <>
                          <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border">{left.lineNum}</div>
                          <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border">-</div>
                        </>
                      )}
                      <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                        {renderLine(left.tokens, true, false, isMoved)}
                      </div>
                      <CopyLineButton text={left.tokens.map(t => t.value).join('')} />
                    </div>
                  )}
                  {right.type === 'added' && (
                    <div className="flex border-b border-border/50 last:border-0 transition-colors duration-200 relative group/line diff-change" style={isMoved ? getMovedStyle() : getAddedStyle()}>
                      {settings.showLineNumbers && (
                        <>
                          <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border">+</div>
                          <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border">{right.lineNum}</div>
                        </>
                      )}
                      <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                        {renderLine(right.tokens, false, true, isMoved)}
                      </div>
                      <CopyLineButton text={right.tokens.map(t => t.value).join('')} />
                    </div>
                  )}
                  {left.type === 'unchanged' && right.type === 'unchanged' && (
                    <div className="flex border-b border-border/50 last:border-0 text-muted-foreground hover:bg-muted/50 transition-colors duration-200" style={isMoved ? getMovedStyle() : {}}>
                      {settings.showLineNumbers && (
                        <>
                          <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30">{left.lineNum}</div>
                          <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30">{right.lineNum}</div>
                        </>
                      )}
                      <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                        {renderLine(left.tokens, false, false, isMoved)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {settings.viewMode === 'inline' && (
          <div className="flex flex-col w-full">
            {rowsToRender.map((row, idx) => {
              if ('type' in row) return <div key={`inl-${idx}`} className="flex w-full border-b border-border/50 last:border-0 bg-muted/10 py-2 justify-center text-xs text-muted-foreground">... {row.count} collapsed unchanged lines ...</div>;
              if (row.left.type === 'unchanged' && row.right.type === 'unchanged') {
                return (
                  <div key={`inl-${idx}`} className="flex border-b border-border/50 last:border-0 text-muted-foreground hover:bg-muted/50 transition-colors duration-200" style={(row.left.moved || row.right.moved) ? getMovedStyle() : {}}>
                    {settings.showLineNumbers && (
                      <>
                        <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30">{row.left.lineNum}</div>
                        <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30">{row.right.lineNum}</div>
                      </>
                    )}
                    <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                      {renderLine(row.left.tokens, false, false, row.left.moved || row.right.moved)}
                    </div>
                  </div>
                );
              }
              const isMoved = row.left.moved || row.right.moved;
              return (
                <div key={`inl-${idx}`} className="flex border-b border-border/50 last:border-0 transition-colors duration-200 relative group/line diff-change" style={isMoved ? getMovedStyle() : {}}>
                  {settings.showLineNumbers && (
                    <>
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border" style={row.left.type === 'removed' ? getRemovedStyle() : {}}>{row.left.lineNum || '\u00A0'}</div>
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border" style={row.right.type === 'added' ? getAddedStyle() : {}}>{row.right.lineNum || '\u00A0'}</div>
                    </>
                  )}
                  <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                    {row.left.type === 'removed' && renderLine(row.left.tokens, true, false, isMoved)}
                    {row.right.type === 'added' && renderLine(row.right.tokens, false, true, isMoved)}
                  </div>
                  <CopyLineButton text={
                    (row.left.type === 'removed' ? row.left.tokens.map(t => t.value).join('') : '') +
                    (row.right.type === 'added' ? row.right.tokens.map(t => t.value).join('') : '')
                  } />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showMinimap && (
        <DiffMinimap rows={rowsToRender} onScrollToIndex={handleScrollToIndex} similarityHeatmap={similarityHeatmap} />
      )}
    </div>
  );
}