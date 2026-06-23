// src/components/VideoGallery.jsx
// A grid of all brand videos — autoplay muted + loop, tap to unmute.
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { VIDEOS } from '@/lib/media'

function VideoCard({ v, i }) {
  const ref = useRef(null)
  const [muted, setMuted] = useState(true)
  const toggle = (e) => {
    e.stopPropagation()
    const el = ref.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
    if (el.paused) el.play().catch(() => {})
  }
  return (
    <motion.div
      className="relative aspect-video overflow-hidden border border-gold/15 group bg-charcoal"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.08, duration: 0.55 }}
    >
      <video
        ref={ref}
        src={v.src}
        poster={v.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-charcoal/80 to-transparent pointer-events-none">
        <p className="font-title text-[0.5rem] tracking-[0.2em] uppercase text-gold/80">{v.tag}</p>
        <h3 className="font-editorial text-sm text-cream-soft">{v.title}</h3>
      </div>
      <button
        onClick={toggle}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-charcoal/60 backdrop-blur-sm text-gold border border-gold/30 flex items-center justify-center hover:bg-charcoal/80 transition-colors"
      >
        {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
    </motion.div>
  )
}

export default function VideoGallery({
  eyebrow = 'In Motion',
  title = 'Films & Walk-throughs',
  subtitle = 'Our spaces and projects, in motion.',
  className = 'bg-charcoal-mid',
}) {
  if (!VIDEOS.length) return null
  return (
    <section className={`section-base ${className}`}>
      <div className="section-header-center">
        <p className="eyebrow mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>{eyebrow}</p>
        <h2 className="text-display-md text-gold-light font-display">{title}</h2>
        <div className="gold-divider" />
        <p className="font-body text-[0.88rem] text-cream-soft/70 max-w-md mx-auto mt-2">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[1100px] mx-auto">
        {VIDEOS.map((v, i) => <VideoCard key={v.src} v={v} i={i} />)}
      </div>
    </section>
  )
}
