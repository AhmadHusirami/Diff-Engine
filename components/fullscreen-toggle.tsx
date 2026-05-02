import React from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '@/components/i18n/language-context';

interface Props {
  fullscreen: boolean;
  onToggle: () => void;
}

export function FullscreenToggle({ fullscreen, onToggle }: Props) {
  const { t } = useLanguage();
  return (
    <Button variant="ghost" size="icon" onClick={onToggle} title={fullscreen ? t('exit_fullscreen') : t('fullscreen')}>
      {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
    </Button>
  );
}