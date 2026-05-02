import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useLanguage } from '@/components/i18n/language-context';

interface Action {
  id: string;
  label: string;
  onSelect: () => void;
}

export function CommandPalette({ open, onClose, actions }: { open: boolean; onClose: () => void; actions: Action[] }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="bg-popover rounded-xl shadow-xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder={t('type_command')} />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.map(action => (
            <Button key={action.id} variant="ghost" className="w-full justify-start" onClick={() => { action.onSelect(); onClose(); }}>
              {action.label}
            </Button>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground p-2">{t('no_results')}</p>}
        </div>
      </div>
    </div>
  );
}