import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Clock } from 'lucide-react';
import { useLanguage } from '@/components/i18n/language-context';

interface Props {
  onShare: (hours: number) => Promise<void>;
  shareUrl: string;
  children: React.ReactElement;
}

export function ShareExpiryPopover({ onShare, shareUrl, children }: Props) {
  const [hours, setHours] = useState(0);
  const { t } = useLanguage();
  return (
    <Popover>
      <PopoverTrigger render={children} />
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))]">
        <div className="space-y-4">
          <h4 className="font-medium">{t('share_link')}</h4>
          <div className="flex flex-wrap gap-2 items-center">
            <Clock className="w-4 h-4" />
            <Label>{t('expiry_hours')}:</Label>
            <Input type="number" min={0} value={hours} onChange={e => setHours(Number(e.target.value))} className="w-20" />
          </div>
          <Button onClick={() => onShare(hours)}><Share2 className="w-4 h-4 mr-2" /> {t('share')}</Button>
          {shareUrl && <div className="break-all text-xs bg-muted p-2 rounded">{shareUrl}</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
