import { create } from 'zustand'

const STORAGE_KEY = 'homeops-theme'
const THEME_COLORS = {
  light: '#F8F7F4',
  dark: '#131614',
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // ignore storage errors
  }
  return 'light'
}

export function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', THEME_COLORS[theme] ?? THEME_COLORS.light)
  }
}

const initialTheme = getInitialTheme()
applyThemeToDocument(initialTheme)

export const useThemeStore = create((set, get) => ({
  theme: initialTheme,

  setTheme: (nextTheme) => {
    const valid = nextTheme === 'dark' ? 'dark' : 'light'
    applyThemeToDocument(valid)
    try {
      localStorage.setItem(STORAGE_KEY, valid)
    } catch {
      // ignore storage errors
    }
    set({ theme: valid })
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
}))
