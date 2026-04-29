"use client";

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { useLanguage } from '@/components/i18n/language-context';

export function ShortcutsPopover() {
  const { t } = useLanguage();

  const shortcuts = [
    { key: 'Alt + C', desc: t('copy_diff') },
    { key: 'Alt + X', desc: t('clear') },
    { key: 'Alt + S', desc: t('swap') },
    { key: 'Ctrl + Z', desc: t('undo') },
    { key: 'Shift + Ctrl + Z', desc: t('redo') },
  ];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Keyboard className="w-4 h-4" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-64">
        <div className="space-y-2">
          <h4 className="font-semibold">{t('shortcuts_title')}</h4>
          <div className="grid gap-1">
            {shortcuts.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between text-sm"
              >
                <kbd className="px-1.5 py-0.5 bg-muted rounded border font-mono text-xs">
                  {s.key}
                </kbd>
                <span>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}