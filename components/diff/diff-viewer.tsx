"use client";

import React, { useMemo, useDeferredValue, useEffect, useState } from 'react';
import * as Diff from 'diff';
import { Copy, Check } from 'lucide-react';
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

type Token = { value: string; added?: boolean; removed?: boolean };
export type Row = {
  left: { type: 'removed' | 'unchanged' | 'empty'; tokens: Token[]; lineNum?: number };
  right: { type: 'added' | 'unchanged' | 'empty'; tokens: Token[]; lineNum?: number };
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

export function DiffViewer({ onResult }: { onResult: (res: any) => void }) {
  const { originalText, modifiedText, settings } = useDiffContext();

  const deferredOriginal = useDeferredValue(originalText);
  const deferredModified = useDeferredValue(modifiedText);

  const diffResult = useMemo(() => {
    if (!deferredOriginal && !deferredModified) {
      const res = { rows: [], addedLinesCount: 0, removedLinesCount: 0, unchangedLinesCount: 0 };
      return res;
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
      if (lines[lines.length - 1] === '') lines.pop(); // Remove trailing empty line from split
      return lines;
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
              leftTokens = wd.filter((t) => !t.added);
              rightTokens = wd.filter((t) => !t.removed);
            } else {
              leftTokens = [{ value: leftText, removed: true }];
              rightTokens = [{ value: rightText, added: true }];
            }
          } else {
            if (leftText !== undefined) leftTokens = [{ value: leftText, removed: true }];
            if (rightText !== undefined) rightTokens = [{ value: rightText, added: true }];
          }

          rows.push({
            left:
              leftText !== undefined
                ? { type: 'removed', tokens: leftTokens, lineNum: leftNum++ }
                : { type: 'empty', tokens: [] },
            right:
              rightText !== undefined
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

    const res = { rows, addedLinesCount, removedLinesCount, unchangedLinesCount };
    return res;
  }, [deferredOriginal, deferredModified, settings.wordLevelDiff, settings.ignoreWhitespace, settings.ignoreCase]);

  useEffect(() => {
    onResult(diffResult);
  }, [diffResult, onResult]);

  const highlightText = (text: string) => {
    if (!settings.language || settings.language === 'text') return text;
    try {
      if (Prism.languages[settings.language]) {
        return Prism.highlight(text, Prism.languages[settings.language], settings.language);
      }
    } catch (e) {
      console.error(e);
    }
    return text;
  };

  if (!diffResult.rows.length) return null;

  const getAddedStyle = () => ({ backgroundColor: settings.colors.addedBg, color: settings.colors.addedText });
  const getRemovedStyle = () => ({ backgroundColor: settings.colors.removedBg, color: settings.colors.removedText });
  const getAddedWordStyle = () => ({ backgroundColor: settings.colors.addedText + '40', color: settings.colors.addedText });
  const getRemovedWordStyle = () => ({ backgroundColor: settings.colors.removedText + '40', color: settings.colors.removedText, textDecorationColor: settings.colors.removedText });

  const renderRows = () => {
    if (!settings.collapseUnchanged) {
      return diffResult.rows as (Row | { type: 'collapsed_placeholder', count: number })[];
    }

    const collapsedRows: (Row | { type: 'collapsed_placeholder', count: number })[] = [];
    let unchangedCount = 0;
    let collapsedStartIdx = -1;
    const CONTEXT_LINES = 3;

    for (let i = 0; i < diffResult.rows.length; i++) {
      const row = diffResult.rows[i];
      const isUnchanged = row.left.type === 'unchanged' && row.right.type === 'unchanged';

      if (isUnchanged) {
        unchangedCount++;
        // Keep context lines around changes
        if (
          (i < CONTEXT_LINES) || // Beginning of file
          (i > diffResult.rows.length - 1 - CONTEXT_LINES) || // End of file
          (diffResult.rows.slice(Math.max(0, i - CONTEXT_LINES), i).some((r: any) => r.left.type !== 'unchanged' || r.right.type !== 'unchanged')) || // After a change
          (diffResult.rows.slice(i + 1, i + 1 + CONTEXT_LINES).some((r: any) => r.left.type !== 'unchanged' || r.right.type !== 'unchanged')) // Before a change
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
    
    if (collapsedStartIdx !== -1) {
      collapsedRows.push({ type: 'collapsed_placeholder', count: unchangedCount - CONTEXT_LINES });
    }
    
    return collapsedRows;
  };

  const rowsToRender = renderRows();

  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-sm overflow-x-auto font-mono text-sm leading-relaxed", `theme-${settings.syntaxTheme}`)}>
      {settings.viewMode === 'split' && (
        <div className="flex flex-col w-full min-w-[600px] md:min-w-full">
          {rowsToRender.map((row, idx) => {
            if ('type' in row) {
              return (
                <div key={`col-${idx}`} className="flex w-full border-b border-border/50 last:border-0 bg-muted/10 py-2 justify-center text-xs text-muted-foreground">
                  ... {row.count} collapsed unchanged lines ...
                </div>
              );
            }
            return (
            <div key={idx} className={cn("flex w-full border-b border-border/50 last:border-0 group animate-in fade-in slide-in-from-top-1 duration-300", (row.left.type !== 'unchanged' || row.right.type !== 'unchanged') && "diff-change")}>
              {/* Left Side */}
              <div
                className={cn(
                  "flex-1 flex border-e border-border transition-colors duration-200 relative group/line",
                  row.left.type === 'unchanged' ? 'text-muted-foreground hover:bg-muted/50' : 'bg-muted/20'
                )}
                style={row.left.type === 'removed' ? getRemovedStyle() : {}}
              >
                {settings.showLineNumbers && (
                  <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30 group-hover:bg-muted/60 transition-colors duration-200">
                    {row.left.lineNum || '\u00A0'}
                  </div>
                )}
                <div className={cn("flex-1 px-4 py-1 overflow-hidden", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                  {row.left.type !== 'empty' &&
                    row.left.tokens.map((t, i) => (
                      <span
                        key={i}
                        className={t.removed ? 'line-through rounded-sm px-0.5 animate-in fade-in zoom-in-95 duration-500' : ''}
                        style={t.removed ? getRemovedWordStyle() : {}}
                        dangerouslySetInnerHTML={{ __html: highlightText(t.value) }}
                      />
                    ))}
                </div>
                {row.left.type !== 'empty' && (
                  <CopyLineButton text={row.left.tokens.map(t => t.value).join('')} />
                )}
              </div>

              {/* Right Side */}
              <div
                className={cn(
                  "flex-1 flex transition-colors duration-200 relative group/line",
                  row.right.type === 'unchanged' ? 'text-muted-foreground hover:bg-muted/50' : 'bg-muted/20'
                )}
                style={row.right.type === 'added' ? getAddedStyle() : {}}
              >
                {settings.showLineNumbers && (
                  <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30 group-hover:bg-muted/60 transition-colors duration-200">
                    {row.right.lineNum || '\u00A0'}
                  </div>
                )}
                <div className={cn("flex-1 px-4 py-1 overflow-hidden", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                  {row.right.type !== 'empty' &&
                    row.right.tokens.map((t, i) => (
                      <span
                        key={i}
                        className={t.added ? 'rounded-sm px-0.5 animate-in fade-in zoom-in-95 duration-500' : ''}
                        style={t.added ? getAddedWordStyle() : {}}
                        dangerouslySetInnerHTML={{ __html: highlightText(t.value) }}
                      />
                    ))}
                </div>
                {row.right.type !== 'empty' && (
                  <CopyLineButton text={row.right.tokens.map(t => t.value).join('')} />
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {settings.viewMode === 'unified' && (
        <div className="flex flex-col w-full">
          {rowsToRender.flatMap((row, idx) => {
            if ('type' in row) {
              return (
                <div key={`col-${idx}`} className="flex w-full border-b border-border/50 last:border-0 bg-muted/10 py-2 justify-center text-xs text-muted-foreground">
                  ... {row.count} collapsed unchanged lines ...
                </div>
              );
            }
            const lines = [];
            if (row.left.type === 'removed') {
              lines.push(
                <div
                  key={`${idx}-left`}
                  className="flex border-b border-border/50 last:border-0 transition-colors duration-200 animate-in fade-in slide-in-from-top-1 relative group/line diff-change"
                  style={getRemovedStyle()}
                >
                  {settings.showLineNumbers && (
                    <>
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border">
                        {row.left.lineNum}
                      </div>
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border">
                        -
                      </div>
                    </>
                  )}
                  <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                    {row.left.tokens.map((t, i) => (
                      <span
                        key={i}
                        className={t.removed ? 'line-through rounded-sm px-0.5 animate-in fade-in zoom-in-95 duration-500' : ''}
                        style={t.removed ? getRemovedWordStyle() : {}}
                        dangerouslySetInnerHTML={{ __html: highlightText(t.value) }}
                      />
                    ))}
                  </div>
                  <CopyLineButton text={row.left.tokens.map(t => t.value).join('')} />
                </div>
              );
            }
            if (row.right.type === 'added') {
              lines.push(
                <div
                  key={`${idx}-right`}
                  className="flex border-b border-border/50 last:border-0 transition-colors duration-200 animate-in fade-in slide-in-from-top-1 relative group/line diff-change"
                  style={getAddedStyle()}
                >
                  {settings.showLineNumbers && (
                    <>
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border">
                        +
                      </div>
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border">
                        {row.right.lineNum}
                      </div>
                    </>
                  )}
                  <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                    {row.right.tokens.map((t, i) => (
                      <span
                        key={i}
                        className={t.added ? 'rounded-sm px-0.5 animate-in fade-in zoom-in-95 duration-500' : ''}
                        style={t.added ? getAddedWordStyle() : {}}
                        dangerouslySetInnerHTML={{ __html: highlightText(t.value) }}
                      />
                    ))}
                  </div>
                  <CopyLineButton text={row.right.tokens.map(t => t.value).join('')} />
                </div>
              );
            }
            if (row.left.type === 'unchanged' && row.right.type === 'unchanged') {
              lines.push(
                <div
                  key={`${idx}-unchanged`}
                  className="flex border-b border-border/50 last:border-0 text-muted-foreground hover:bg-muted/50 transition-colors duration-200"
                >
                  {settings.showLineNumbers && (
                    <>
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30">
                        {row.left.lineNum}
                      </div>
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30">
                        {row.right.lineNum}
                      </div>
                    </>
                  )}
                  <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                    {row.left.tokens.map((t, i) => (
                      <span
                        key={i}
                        dangerouslySetInnerHTML={{ __html: highlightText(t.value) }}
                      />
                    ))}
                  </div>
                </div>
              );
            }
            return lines;
          })}
        </div>
      )}

      {settings.viewMode === 'inline' && (
        <div className="flex flex-col w-full">
          {rowsToRender.map((row, idx) => {
            if ('type' in row) {
              return (
                <div key={`col-${idx}`} className="flex w-full border-b border-border/50 last:border-0 bg-muted/10 py-2 justify-center text-xs text-muted-foreground">
                  ... {row.count} collapsed unchanged lines ...
                </div>
              );
            }
            if (row.left.type === 'unchanged' && row.right.type === 'unchanged') {
              return (
                <div
                  key={`${idx}-unchanged`}
                  className="flex border-b border-border/50 last:border-0 text-muted-foreground hover:bg-muted/50 transition-colors duration-200"
                >
                  {settings.showLineNumbers && (
                    <>
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30">
                        {row.left.lineNum}
                      </div>
                      <div className="w-12 shrink-0 text-end pe-3 py-1 select-none text-muted-foreground border-e border-border bg-muted/30">
                        {row.right.lineNum}
                      </div>
                    </>
                  )}
                  <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                    {row.left.tokens.map((t, i) => (
                      <span key={i} dangerouslySetInnerHTML={{ __html: highlightText(t.value) }} />
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${idx}-changed`}
                className="flex border-b border-border/50 last:border-0 transition-colors duration-200 animate-in fade-in slide-in-from-top-1 relative group/line diff-change"
              >
                {settings.showLineNumbers && (
                  <>
                    <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border" style={row.left.type === 'removed' ? getRemovedStyle() : {}}>
                      {row.left.lineNum || '\u00A0'}
                    </div>
                    <div className="w-12 shrink-0 text-end pe-3 py-1 select-none opacity-70 border-e border-border" style={row.right.type === 'added' ? getAddedStyle() : {}}>
                      {row.right.lineNum || '\u00A0'}
                    </div>
                  </>
                )}
                <div className={cn("flex-1 px-4 py-1", settings.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
                  {row.left.type === 'removed' && row.left.tokens.map((t, i) => (
                    <span
                      key={`l-${i}`}
                      className={t.removed ? 'line-through rounded-sm px-0.5 animate-in fade-in zoom-in-95 duration-500' : 'rounded-sm px-0.5'}
                      style={t.removed ? getRemovedWordStyle() : getRemovedStyle()}
                      dangerouslySetInnerHTML={{ __html: highlightText(t.value) }}
                    />
                  ))}
                  {row.right.type === 'added' && row.right.tokens.map((t, i) => (
                    <span
                      key={`r-${i}`}
                      className={t.added ? 'rounded-sm px-0.5 animate-in fade-in zoom-in-95 duration-500' : 'rounded-sm px-0.5'}
                      style={t.added ? getAddedWordStyle() : getAddedStyle()}
                      dangerouslySetInnerHTML={{ __html: highlightText(t.value) }}
                    />
                  ))}
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
  );
}
