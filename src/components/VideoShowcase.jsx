// src/components/VideoShowcase.jsx
// Reusable luxury video band — autoplays muted, loops; tap to unmute.
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { OFFICE_VIDEO, OFFICE_VIDEO_POSTER } from '@/lib/media'

export default function VideoShowcase({
  eyebrow = 'In Motion',
  title = 'Step Inside Our Work',
  subtitle = 'A walk-through of a Maxims space — design, texture and light in motion.',
  src = OFFICE_VIDEO,
  poster = OFFICE_VIDEO_POSTER,
  className = 'bg-charcoal-mid',
}) {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
    if (v.paused) v.play().catch(() => {})
  }

  return (
    <section className={`section-base ${className}`}>
      <div className="section-header-center">
        <p className="eyebrow mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>{eyebrow}</p>
        <h2 className="text-display-md text-gold-light font-display">{title}</h2>
        <div className="gold-divider" />
        <p className="font-body text-[0.88rem] text-cream-soft/70 max-w-md mx-auto mt-2">{subtitle}</p>
      </div>

      <motion.div
        className="relative max-w-[960px] mx-auto aspect-video overflow-hidden border border-gold/20 shadow-deep"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="w-full h-full object-cover bg-charcoal"
        />
        <button
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-charcoal/60 backdrop-blur-sm text-gold border border-gold/30 flex items-center justify-center hover:bg-charcoal/80 transition-colors"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </motion.div>
    </section>
  )
}
