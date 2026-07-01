// src/components/CollectionShowcase.jsx
// Signature throw-pillow collections — portrait product reels that autoplay,
// and "pop out" (scale up) on hover. Links through to the shop.
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { COLLECTIONS } from '@/lib/media'
import { formatNaira } from '@/lib/utils'

function CollectionCard({ c, i }) {
  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.07, duration: 0.5 }}
    >
      <Link to="/shop" className="block">
        <div className="relative aspect-[3/4] overflow-hidden border border-gold/15 bg-charcoal
                        transition-all duration-500 ease-luxury
                        group-hover:scale-[1.06] group-hover:z-20 group-hover:shadow-gold-lg group-hover:border-gold/50">
          <video
            src={c.video}
            poster={c.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="font-title text-[0.5rem] tracking-[0.22em] uppercase text-gold/80 mb-1">Signature</p>
            <h3 className="font-editorial text-lg text-cream-soft leading-tight">{c.name}</h3>
            <div className="flex items-center justify-between mt-1.5">
              <span className="font-title text-[0.82rem] text-gold-light font-semibold">{formatNaira(c.price)}</span>
              <span className="font-title text-[0.55rem] tracking-[0.18em] uppercase text-cream-soft/70 group-hover:text-gold transition-colors">Shop →</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function CollectionShowcase({
  eyebrow = 'New In',
  title = 'Signature Collections',
  subtitle = 'Our latest throw-pillow collections — hover to see each one in motion.',
  className = 'bg-charcoal-mid',
}) {
  if (!COLLECTIONS.length) return null
  return (
    <section className={`section-base ${className}`}>
      <div className="section-header-center">
        <p className="eyebrow mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>{eyebrow}</p>
        <h2 className="text-display-md text-gold-light font-display">{title}</h2>
        <div className="gold-divider" />
        <p className="font-body text-[0.88rem] text-cream-soft/70 max-w-md mx-auto mt-2">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 max-w-[1150px] mx-auto">
        {COLLECTIONS.map((c, i) => <CollectionCard key={c.slug} c={c} i={i} />)}
      </div>
    </section>
  )
}
