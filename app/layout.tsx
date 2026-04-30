import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/i18n/language-context";

// Load the IBM Plex Sans variable font from the public directory
const ibmPlexSans = localFont({
  src: '../public/assets/fonts/IBMPlexSans-VariableFont_wdth,wght.ttf',
  variable: '--font-sans',          // attaches to the CSS variable used by Tailwind
  display: 'swap',
  weight: '100 900',                // variable weight range
  style: 'normal',
  axes: ['wdth', 'wght'],           // width and weight axes
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Text Diff Tool',
  description: 'Compare and visualize differences between two pieces of text.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(jetbrainsMono.variable, ibmPlexSans.variable, "font-sans")}>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="white"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}