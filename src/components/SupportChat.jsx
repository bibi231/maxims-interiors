// src/components/SupportChat.jsx
// Loads the SupportAI chat widget on public pages only.
// Deferred + fault-tolerant: if SupportAI is slow or down, the page is
// completely unaffected — the widget simply doesn't appear. Configure via
// VITE_SUPPORTAI_WIDGET_URL + VITE_SUPPORTAI_SITE_KEY.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const URL = import.meta.env.VITE_SUPPORTAI_WIDGET_URL || 'https://supportai.com.ng/widget.js'
const KEY = import.meta.env.VITE_SUPPORTAI_SITE_KEY || ''
const SCRIPT_ID = 'supportai-widget'

export default function SupportChat() {
  const { pathname } = useLocation()
  const onAdmin = pathname.startsWith('/admin')

  useEffect(() => {
    if (!KEY || onAdmin) return
    if (document.getElementById(SCRIPT_ID)) return

    // Load only after the page is interactive so it never blocks rendering.
    const inject = () => {
      const s = document.createElement('script')
      s.id = SCRIPT_ID
      s.src = URL
      s.async = true
      s.defer = true
      // Common data-attribute conventions for auto-init widgets.
      s.setAttribute('data-site-key', KEY)
      s.setAttribute('data-key', KEY)
      s.setAttribute('data-business', KEY)
      s.onload = () => {
        // Fallback: if the widget exposes an init() instead of auto-starting.
        try { window.SupportAIWidget?.init?.({ siteKey: KEY, key: KEY }) } catch { /* ignore */ }
      }
      s.onerror = () => { /* SupportAI unavailable — fail silently */ }
      document.body.appendChild(s)
    }

    if (document.readyState === 'complete') inject()
    else { window.addEventListener('load', inject, { once: true }); return () => window.removeEventListener('load', inject) }
  }, [onAdmin])

  return null
}
