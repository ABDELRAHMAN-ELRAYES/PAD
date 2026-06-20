"use client"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme, type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      storageKey="pad-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export function useTheme() {
  return {
    isDark: false,
    theme: "light",
    setTheme: () => {},
    toggle: () => {},
  }
}

export default ThemeProvider
