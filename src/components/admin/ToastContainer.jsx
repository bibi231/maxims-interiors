// src/components/admin/ToastContainer.jsx
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-3 w-[320px] max-w-[calc(100vw-2.5rem)]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={() => { if (t.to) navigate(t.to); removeToast(t.id) }}
            className="bg-charcoal border border-gold/40 shadow-gold-glow p-4 flex items-start gap-3 cursor-pointer group"
          >
            {t.icon && <span className="text-lg leading-none mt-0.5">{t.icon}</span>}
            <div className="flex-1 min-w-0">
              {t.title && <div className="font-title text-[0.65rem] tracking-[0.15em] uppercase text-gold">{t.title}</div>}
              <div className="font-body text-sm text-cream-soft/80 mt-0.5">{t.message}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeToast(t.id) }}
              className="text-cream-soft/30 hover:text-gold transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
