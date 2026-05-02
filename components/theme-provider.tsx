"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  themes = ['light', 'dark', 'system'],
  ...props
}: React.ComponentProps<typeof NextThemesProvider> & { themes?: string[] }) {
  return <NextThemesProvider themes={themes} {...props}>{children}</NextThemesProvider>
}