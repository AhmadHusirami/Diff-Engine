import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDiffContext } from '@/components/diff/diff-context';
import { Trash2, Save } from 'lucide-react';
import { useLanguage } from '@/components/i18n/language-context';

export function PresetManager() {
  const { presets, savePreset, loadPreset, deletePreset } = useDiffContext();
  const [name, setName] = useState('');
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('presets')}</h5>
      <div className="flex items-center gap-2">
        <Input className="flex-1" value={name} onChange={e => setName(e.target.value)} placeholder={t('preset_name')} />
        <Button size="sm" onClick={() => { savePreset(name); setName(''); }} disabled={!name}>
          <Save className="w-3.5 h-3.5" />
        </Button>
      </div>
      {presets.length > 0 && (
        <Select onValueChange={(value) => loadPreset(value as string)}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder={t('load_preset')} />
          </SelectTrigger>
          <SelectContent>
            {presets.map(p => (
              <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="space-y-1">
        {presets.map(p => (
          <div key={p.name} className="flex items-center justify-between text-xs">
            <span>{p.name}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deletePreset(p.name)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
