// src/components/ui/Reveal.jsx
import { motion } from 'framer-motion'

const EASE = [0.4, 0, 0.2, 1]

/**
 * Scroll-reveal wrapper. Fades + lifts children into view once.
 * <Reveal delay={0.1}>...</Reveal>
 */
export default function Reveal({ children, delay = 0, y = 22, className = '', once = true }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}
