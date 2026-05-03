"use client";

import React, { useRef } from 'react';
import { Row } from './diff-viewer';

interface MinimapProps {
  rows: (Row | { type: 'collapsed_placeholder'; count: number })[];
  onScrollToIndex: (index: number) => void;
  similarityHeatmap?: boolean;
}

export function DiffMinimap({ rows, onScrollToIndex, similarityHeatmap = false }: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    const totalLines = rows.length;
    const index = Math.floor(ratio * totalLines);
    if (index >= 0 && index < totalLines) {
      onScrollToIndex(index);
    }
  };

  const getSimilarityColor = (row: Row) => {
    if (!similarityHeatmap) return undefined;
    const leftText = row.left.tokens.map(t => t.value).join('');
    const rightText = row.right.tokens.map(t => t.value).join('');
    if (row.left.type === 'unchanged' && row.right.type === 'unchanged') {
      return 'bg-green-500/80';
    }
    if (row.left.type === 'removed' && row.right.type === 'added' && leftText && rightText) {
      const len = Math.max(leftText.length, rightText.length);
      if (len === 0) return 'bg-red-500/80';
      const match = [...leftText].filter((c, i) => c === rightText[i]).length;
      const similarity = match / len;
      if (similarity > 0.8) return 'bg-lime-400/80';
      if (similarity > 0.5) return 'bg-amber-400/80';
      return 'bg-orange-500/80';
    }
    if (row.left.type === 'removed') return 'bg-red-500/80';
    if (row.right.type === 'added') return 'bg-blue-500/80';
    return 'bg-muted-foreground/20';
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="w-12 h-full bg-muted/10 border-l border-border/50 cursor-pointer overflow-hidden select-none"
      aria-label="Minimap - click to scroll"
    >
      <div className="flex flex-col h-full scale-y-[0.2] origin-top">
        {rows.map((row, idx) => {
          if ('type' in row) {
            return <div key={idx} className="h-1 w-full bg-muted-foreground/30" />;
          }
          const colorClass = getSimilarityColor(row);
          return <div key={idx} className={`h-1 w-full ${colorClass || 'bg-muted-foreground/20'}`} />;
        })}
      </div>
    </div>
  );
}



