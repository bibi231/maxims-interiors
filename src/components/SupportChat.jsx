// src/components/SupportChat.jsx
// Loads the Maxims SupportAI chat widget (bot 6a58aa0726d3a64c4c51611b) on
// public pages. Exactly one loader on the site: this component. It injects
//   <script src="https://api.supportai.com.ng/widget/6a58aa0726d3a64c4c51611b.js" defer>
// once, after the page has loaded, so it never blocks rendering. If SupportAI
// is slow or down, the widget simply does not appear.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const WIDGET_SRC = 'https://api.supportai.com.ng/widget/6a58aa0726d3a64c4c51611b.js'
const SCRIPT_ID = 'supportai-widget'

export default function SupportChat() {
  const { pathname } = useLocation()
  const onAdmin = pathname.startsWith('/admin')

  useEffect(() => {
    if (onAdmin) return
    if (document.getElementById(SCRIPT_ID) || document.querySelector(`script[src="${WIDGET_SRC}"]`)) return

    const inject = () => {
      if (document.getElementById(SCRIPT_ID)) return
      const s = document.createElement('script')
      s.id = SCRIPT_ID
      s.src = WIDGET_SRC
      s.defer = true
      s.onerror = () => { /* SupportAI unavailable: fail silently */ }
      document.body.appendChild(s)
    }

    if (document.readyState === 'complete') inject()
    else { window.addEventListener('load', inject, { once: true }); return () => window.removeEventListener('load', inject) }
  }, [onAdmin])

  return null
}
