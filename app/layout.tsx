import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LanguageProvider } from '@/components/i18n/language-context';
import Script from 'next/script';
import appMeta from '../metadata.json';

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
  title: appMeta.name,
  description: appMeta.description,
  applicationName: appMeta.name,
  keywords: appMeta.keywords,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: appMeta.name,
    description: appMeta.description,
    type: 'website',
    locale: 'en_US',
    siteName: appMeta.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: appMeta.name,
    description: appMeta.description,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(jetbrainsMono.variable, ibmPlexSans.variable, 'font-sans')}>
      <head>
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
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
