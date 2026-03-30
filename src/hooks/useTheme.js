// 主題切換 Hook — 深色/亮色模式
import { useState, useEffect, useCallback } from 'react'

const THEME_KEY = 'sd-platform-theme'

/**
 * 主題切換 Hook
 * 預設深色模式，支持 dark / light 切換
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'dark'
    } catch {
      return 'dark'
    }
  })

  // 同步 data-theme 屬性到 <html> 元素
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // 靜默失敗
    }
  }, [theme])

  // 切換主題
  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  // 設定特定主題
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme)
  }, [])

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  }
}
