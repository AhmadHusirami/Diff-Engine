import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LanguageProvider } from '@/components/i18n/language-context';
import Script from 'next/script';

const ibmPlexSans = localFont({
  src: '../public/assets/fonts/IBMPlexSans-VariableFont_wdth,wght.ttf',
  variable: '--font-sans',
  display: 'swap',
  weight: '100 900',
  style: 'normal',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Text Diff Tool',
  description: 'Compare and visualize differences between two pieces of text.',
  manifest: '/manifest.json',
  icons: {
    icon: '/assets/icons/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(jetbrainsMono.variable, ibmPlexSans.variable, 'font-sans')}>
      <head>
        <link rel="apple-touch-icon" href="/assets/icons/icon-192.png" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="white"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark', 'high-contrast', 'high-contrast-dark']}
        >
          <LanguageProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}