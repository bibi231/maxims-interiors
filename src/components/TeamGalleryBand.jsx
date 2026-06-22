// src/components/TeamGalleryBand.jsx
// A lifestyle band of real team/studio photos (no individual names needed).
import { motion } from 'framer-motion'
import { TEAM_PHOTOS } from '@/lib/media'

export default function TeamGalleryBand({
  eyebrow = 'The People',
  title = 'The Maxims Team',
  subtitle = 'The artisans and designers behind every Maxims space.',
  className = 'bg-cream',
}) {
  if (!TEAM_PHOTOS.length) return null
  return (
    <section className={`section-base ${className}`}>
      <div className="section-header-center">
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h2 className="text-display-md text-purple-rich dark:text-gold-light font-display">{title}</h2>
        <div className="gold-divider" />
        <p className="font-body text-[0.88rem] text-charcoal-muted max-w-md mx-auto mt-2">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[1100px] mx-auto">
        {TEAM_PHOTOS.map((src, i) => (
          <motion.div
            key={i}
            className="relative aspect-[4/5] overflow-hidden border border-gold/15 group"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
          >
            <img
              src={src}
              alt="The Maxims team"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
