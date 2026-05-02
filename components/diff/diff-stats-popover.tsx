"use client";

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BarChart2 } from 'lucide-react';
import { useLanguage } from '@/components/i18n/language-context';

interface Stats {
  addedLines: number;
  removedLines: number;
  unchangedLines: number;
  addedWords: number;
  removedWords: number;
  totalLines: number;
  changedLinesPercent: string;
  similarity: string;
}

interface DiffStatsPopoverProps {
  stats: Stats;
}

export function DiffStatsPopover({ stats }: DiffStatsPopoverProps) {
  const { t } = useLanguage();

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="icon" className="h-9 w-9" />}>
        <BarChart2 className="w-4 h-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <h4 className="font-semibold">{t('stats_title')}</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span>{t('lines')}:</span>
            <span>{stats.totalLines}</span>
            <span>{t('added_lines')}:</span>
            <span className="text-green-600 font-medium">{stats.addedLines}</span>
            <span>{t('removed_lines')}:</span>
            <span className="text-red-600 font-medium">{stats.removedLines}</span>
            <span>{t('unchanged_lines')}:</span>
            <span>{stats.unchangedLines}</span>
            <span>{t('words')} {t('added_lines')}:</span>
            <span className="text-green-600 font-medium">{stats.addedWords}</span>
            <span>{t('words')} {t('removed_lines')}:</span>
            <span className="text-red-600 font-medium">{stats.removedWords}</span>
            <span>{t('changed')} %:</span>
            <span>{stats.changedLinesPercent}%</span>
            <span>{t('similarity')}:</span>
            <span>{stats.similarity}%</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}