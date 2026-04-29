import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/i18n/language-context";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Text Diff Tool',
  description: 'Compare and visualize differences between two pieces of text.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(jetbrainsMono.variable, inter.variable, "font-sans")}>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
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
