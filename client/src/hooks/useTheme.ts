'use client'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')

  // Read persisted value on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme') as Theme | null
      if (saved === 'dark') setThemeState('dark')
    } catch {}
  }, [])

  // Keep data-theme attribute + localStorage in sync
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
    }
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  const toggle = () => setThemeState((t) => (t === 'light' ? 'dark' : 'light'))

  return { theme, toggle }
}
