"use client"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme, type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem storageKey="pad-theme" {...props}>
      {children}
    </NextThemesProvider>
  )
}

export function useTheme() {
  const { theme, setTheme, systemTheme } = useNextTheme()
  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark")

  return {
    isDark,
    theme,
    setTheme,
    toggle: () => setTheme(isDark ? "light" : "dark"),
  }
}

export default ThemeProvider
