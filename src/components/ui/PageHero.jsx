// src/components/ui/PageHero.jsx
import { motion } from 'framer-motion'

/**
 * Standard inner-page hero with eyebrow, title, and optional lead text.
 */
export default function PageHero({ eyebrow, title, lead, children }) {
  return (
    <section className="page-hero bg-charcoal bg-lux-radial">
      <div className="container-lux relative z-10">
        {eyebrow && (
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          >
            {eyebrow}
          </motion.p>
        )}
        <motion.h1
          className="text-display-lg mt-4 text-balance"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}
        >
          {title}
        </motion.h1>
        <div className="gold-divider" />
        {lead && (
          <motion.p
            className="max-w-2xl mx-auto font-body text-cream-soft/55 text-base sm:text-lg leading-relaxed text-balance"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
          >
            {lead}
          </motion.p>
        )}
        {children}
      </div>
    </section>
  )
}
