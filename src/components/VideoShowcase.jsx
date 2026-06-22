// src/components/VideoShowcase.jsx
// Reusable luxury video band — click-to-play office walk-through.
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
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
  const [playing, setPlaying] = useState(false)

  const play = () => {
    const v = videoRef.current
    if (!v) return
    v.play()
    setPlaying(true)
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
        className="relative max-w-[960px] mx-auto aspect-video overflow-hidden border border-gold/20 shadow-deep group"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls={playing}
          playsInline
          preload="none"
          className="w-full h-full object-cover bg-charcoal"
          onPause={() => setPlaying(false)}
        />
        {!playing && (
          <button
            onClick={play}
            aria-label="Play video"
            className="absolute inset-0 flex items-center justify-center bg-charcoal/30 hover:bg-charcoal/15 transition-colors"
          >
            <span className="w-20 h-20 rounded-full bg-gold/90 text-purple-darkest flex items-center justify-center shadow-gold-lg group-hover:scale-105 transition-transform">
              <Play size={30} className="ml-1" fill="currentColor" />
            </span>
          </button>
        )}
      </motion.div>
    </section>
  )
}
