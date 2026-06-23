// src/lib/theme.js
// Light/dark theme handling. Default = 'light' (the site's standard look).
// 'dark' adds the `dark` class which activates the dark palette + dark: variants.
const KEY = 'maxims-theme'

export function getTheme() {
  try { return localStorage.getItem(KEY) || 'light' } catch { return 'light' }
}

export function applyTheme(t) {
  const el = document.documentElement
  if (t === 'dark') el.classList.add('dark')
  else el.classList.remove('dark')
}

export function setTheme(t) {
  try { localStorage.setItem(KEY, t) } catch { /* ignore */ }
  applyTheme(t)
}
