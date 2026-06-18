// src/pages/Gallery.jsx
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Calendar, Maximize } from 'lucide-react'
import Meta from '@/components/Meta'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import SmartImage from '@/components/ui/SmartImage'
import { useGallery } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const SIZE_CLASS = {
  small: '',
  medium: 'sm:col-span-2',
  large: 'sm:col-span-2 lg:row-span-2',
}

export default function Gallery() {
  const { data: projects, loading } = useGallery({ published: true })
  const [category, setCategory] = useState('All')
  const [active, setActive] = useState(null) // open project (lightbox)

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(projects.map((p) => p.category).filter(Boolean)))],
    [projects],
  )
  const visible = category === 'All' ? projects : projects.filter((p) => p.category === category)

  const lightboxImages = active
    ? (active.images?.length ? active.images : [active.cover_image]).filter(Boolean)
    : []

  return (
    <>
      <Meta title="Portfolio — Maxims Interiors Interior Design" description="Explore our portfolio of luxury residential and commercial interior design projects across Nigeria." />
      <PageHero
        eyebrow="Portfolio"
        title="A Gallery of Transformations"
        lead="From private residences to landmark hospitality projects — a look at spaces we've brought to life."
      />

      <section className="section-base bg-charcoal pt-10">
        <div className="container-lux">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'font-title text-[0.62rem] tracking-[0.18em] uppercase px-4 py-2 border transition-colors',
                  category === c ? 'border-gold bg-gold/10 text-gold' : 'border-cream-soft/15 text-cream-soft/55 hover:border-gold/50 hover:text-gold',
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[260px]">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" />)}
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center font-body text-cream-soft/40 py-20">No projects in this category yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[280px]">
              {visible.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 0.05} className={SIZE_CLASS[p.grid_size] ?? ''}>
                  <button
                    onClick={() => setActive(p)}
                    className="group relative w-full h-full overflow-hidden text-left"
                  >
                    <SmartImage
                      src={getStorageUrl(BUCKETS.gallery, p.cover_image)}
                      alt={p.title} fallback="🏛"
                      className="w-full h-full transition-transform duration-700 ease-luxe group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/10 to-transparent opacity-90" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="eyebrow text-gold/80">{p.category}</p>
                      <h3 className="font-editorial text-xl text-cream-soft mt-1">{p.title}</h3>
                      {p.location && <p className="font-body text-xs text-cream-soft/50 mt-0.5 flex items-center gap-1"><MapPin size={11} /> {p.location}</p>}
                    </div>
                    <span className="absolute top-4 right-4 grid place-items-center w-9 h-9 bg-purple-darkest/70 text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize size={15} />
                    </span>
                  </button>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-charcoal/95 backdrop-blur-sm overflow-y-auto"
            onClick={() => setActive(null)}
          >
            <button className="fixed top-5 right-5 z-10 text-cream-soft/70 hover:text-gold transition-colors" onClick={() => setActive(null)} aria-label="Close">
              <X size={28} />
            </button>
            <motion.div
              initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}
              className="container-lux px-5 sm:px-8 py-20"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="eyebrow text-gold/80">{active.category}</p>
              <h2 className="text-display-md mt-2">{active.title}</h2>
              <div className="flex flex-wrap gap-5 mt-4 font-body text-sm text-cream-soft/55">
                {active.location && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-gold/60" /> {active.location}</span>}
                {active.year && <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gold/60" /> {active.year}</span>}
                {active.sqft && <span>{active.sqft}</span>}
                {active.duration && <span>{active.duration}</span>}
              </div>
              {active.description && <p className="mt-5 max-w-2xl font-body text-cream-soft/60 leading-relaxed">{active.description}</p>}

              <div className="grid sm:grid-cols-2 gap-4 mt-8">
                {lightboxImages.map((img, i) => (
                  <SmartImage key={i} src={getStorageUrl(BUCKETS.gallery, img)} alt={`${active.title} ${i + 1}`} fallback="🏛" ratio="4/3" />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
