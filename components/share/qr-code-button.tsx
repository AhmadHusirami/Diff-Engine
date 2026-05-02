import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';

export function QrCodeButton({ url }: { url: string }) {
  if (!url) return null;
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon"><QrCode className="w-4 h-4" /></Button>} />
      <PopoverContent className="p-4 flex justify-center">
        <QRCode value={url} size={128} />
      </PopoverContent>
    </Popover>
  );
}