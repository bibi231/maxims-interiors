// src/pages/Home.jsx
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, Sofa, Building2, Lightbulb, Palette, Ruler, Truck,
} from 'lucide-react'
import Meta from '@/components/Meta'
import Reveal from '@/components/ui/Reveal'
import SmartImage from '@/components/ui/SmartImage'
import Stars from '@/components/ui/Stars'
import { SERVICES, BRAND } from '@/data/site'
import { useGallery, useProducts, useTestimonials } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'
import { formatNaira } from '@/lib/utils'

const ICONS = { Sofa, Building2, Lightbulb, Palette, Ruler, Truck }

const MARQUEE = [
  'Residential Design', 'Hospitality', 'Bespoke Furniture', 'Home Goods',
  'Trade Supply', 'Space Planning', 'Lighting Design', 'Styling',
]

const STATS = [
  { value: '200+', label: 'Spaces Transformed' },
  { value: '8', label: 'Years of Craft' },
  { value: '40+', label: 'Trade Partners' },
  { value: '4.9★', label: 'Client Rating' },
]

export default function Home() {
  const { data: works } = useGallery({ published: true, featured: true })
  const { data: products } = useProducts({ status: 'active', featured: true })
  const { data: testimonials } = useTestimonials({ published: true, featured: true })

  const featuredWorks = works.slice(0, 5)
  const featuredProducts = products.slice(0, 4)
  const featuredTestis = testimonials.slice(0, 3)

  return (
    <>
      <Meta
        title="Maxims Interiors — Premium Interior Design in Nigeria"
        description="Luxury interior design, home goods, and trade supply in Abuja. Where Luxury Meets Living."
      />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-charcoal">
        <div className="absolute inset-0 bg-lux-radial" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(201,168,76,0.6) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="container-lux relative z-10 px-5 sm:px-8 lg:px-16 pt-32 pb-16 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <motion.p className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {BRAND.legalName} · {BRAND.city}
            </motion.p>
            <motion.h1
              className="text-display-xl mt-5 text-balance"
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            >
              Where Luxury<br />Meets <span className="italic font-editorial text-gold">Living</span>
            </motion.h1>
            <motion.p
              className="mt-7 max-w-xl font-body text-cream-soft/60 text-base sm:text-lg leading-relaxed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.3 }}
            >
              We design and furnish Nigeria's most refined homes, hotels, and spaces —
              transforming the everyday into something timeless.
            </motion.p>
            <motion.div
              className="mt-9 flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}
            >
              <Link to="/gallery" className="btn-gold-solid">Explore Our Work <ArrowRight size={15} /></Link>
              <Link to="/contact" className="btn-outline-light">Book Consultation</Link>
            </motion.div>
          </div>

          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.4 }}
          >
            <div className="relative">
              <div className="absolute -inset-3 border border-gold/20" />
              <SmartImage
                src={featuredWorks[0] ? getStorageUrl(BUCKETS.gallery, featuredWorks[0].cover_image) : null}
                alt={featuredWorks[0]?.title || 'Featured interior'}
                fallback="🛋"
                ratio="4/5"
                eager
                className="relative"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ────────────────────────────────────── */}
      <div className="bg-purple-darkest border-y border-gold/15 py-4 overflow-hidden">
        <div className="flex w-max animate-marquee-x">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="flex items-center gap-6 px-6 font-title text-[0.7rem] tracking-[0.25em] uppercase text-cream-soft/40">
              {m} <span className="text-gold/50">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── SERVICES ─────────────────────────────────────────── */}
      <section className="section-base bg-charcoal">
        <div className="container-lux">
          <Reveal>
            <p className="eyebrow text-center">What We Do</p>
            <h2 className="text-display-md text-center mt-3">A Complete Design House</h2>
            <div className="gold-divider" />
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gold/10 mt-10">
            {SERVICES.map((s, i) => {
              const Icon = ICONS[s.icon] ?? Sofa
              return (
                <Reveal key={s.title} delay={i * 0.05}>
                  <div className="card-glass h-full p-8 group">
                    <Icon size={26} className="text-gold mb-5" />
                    <h3 className="font-editorial text-xl text-cream-soft mb-3 group-hover:text-gold transition-colors">{s.title}</h3>
                    <p className="font-body text-sm text-cream-soft/55 leading-relaxed">{s.blurb}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURED WORKS ───────────────────────────────────── */}
      <section className="section-base bg-charcoal-mid">
        <div className="container-lux">
          <Reveal>
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="eyebrow">Selected Work</p>
                <h2 className="text-display-md mt-3">Recent Transformations</h2>
              </div>
              <Link to="/gallery" className="btn-outline-gold">View Full Gallery <ArrowUpRight size={15} /></Link>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {(featuredWorks.length ? featuredWorks : Array.from({ length: 3 })).map((w, i) => (
              <Reveal key={w?.id || i} delay={i * 0.06} className={i === 0 ? 'sm:col-span-2 lg:row-span-2' : ''}>
                <Link to="/gallery" className="group block relative overflow-hidden">
                  <SmartImage
                    src={w ? getStorageUrl(BUCKETS.gallery, w.cover_image) : null}
                    alt={w?.title || 'Project'}
                    fallback="🏛"
                    ratio={i === 0 ? '4/3' : '4/3'}
                    className="transition-transform duration-700 ease-luxe group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="eyebrow text-gold/80">{w?.category || 'Interior'}</p>
                    <h3 className="font-editorial text-xl text-cream-soft mt-1">{w?.title || 'A Maxims Project'}</h3>
                    {w?.location && <p className="font-body text-xs text-cream-soft/50 mt-0.5">{w.location}</p>}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT + STATS ────────────────────────────────────── */}
      <section className="section-base bg-charcoal bg-lux-radial">
        <div className="container-lux grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <p className="eyebrow">The Maxims Difference</p>
            <h2 className="text-display-md mt-3 text-balance">Design that feels as good as it looks</h2>
            <p className="mt-6 font-body text-cream-soft/60 leading-relaxed">
              For nearly a decade, Maxims has been Nigeria's address for considered luxury —
              spaces that marry world-class craft with the warmth of home. From a single room
              to an entire hotel, every project carries the same obsession with detail.
            </p>
            <Link to="/about" className="inline-flex items-center gap-2 mt-7 font-title text-xs tracking-[0.2em] uppercase text-gold hover:gap-3 transition-all">
              Our Story <ArrowRight size={14} />
            </Link>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="grid grid-cols-2 gap-px bg-gold/10">
              {STATS.map((s) => (
                <div key={s.label} className="bg-charcoal-mid p-8 text-center">
                  <div className="font-display text-4xl sm:text-5xl text-gold">{s.value}</div>
                  <div className="mt-2 font-body text-[0.7rem] tracking-[0.15em] uppercase text-cream-soft/45">{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SHOP PREVIEW ─────────────────────────────────────── */}
      <section className="section-base bg-charcoal-mid">
        <div className="container-lux">
          <Reveal>
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="eyebrow">The Collection</p>
                <h2 className="text-display-md mt-3">Shop Luxury Home Goods</h2>
              </div>
              <Link to="/shop" className="btn-outline-gold">Browse Shop <ArrowUpRight size={15} /></Link>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {(featuredProducts.length ? featuredProducts : Array.from({ length: 4 })).map((p, i) => (
              <Reveal key={p?.id || i} delay={i * 0.05}>
                <Link to="/shop" className="group block">
                  <div className="relative overflow-hidden">
                    <SmartImage
                      src={p ? getStorageUrl(BUCKETS.products, p.cover_image) : null}
                      alt={p?.name || 'Product'} fallback="🕯" ratio="1/1"
                      className="transition-transform duration-700 ease-luxe group-hover:scale-105"
                    />
                    {p?.badge && (
                      <span className="absolute top-3 left-3 bg-gold text-purple-darkest font-title text-[0.55rem] tracking-[0.15em] uppercase px-2 py-1">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-editorial text-base text-cream-soft group-hover:text-gold transition-colors">{p?.name || 'Maxims Piece'}</h3>
                  <p className="font-body text-sm text-gold/80">{p ? formatNaira(p.price) : '—'}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      {featuredTestis.length > 0 && (
        <section className="section-base bg-purple-darkest">
          <div className="container-lux">
            <Reveal>
              <p className="eyebrow text-center">Kind Words</p>
              <h2 className="text-display-md text-center mt-3">Loved by Our Clients</h2>
              <div className="gold-divider" />
            </Reveal>
            <div className="grid md:grid-cols-3 gap-6 mt-10">
              {featuredTestis.map((t, i) => (
                <Reveal key={t.id} delay={i * 0.08}>
                  <figure className="card-glass h-full p-8 flex flex-col">
                    <Stars rating={t.rating} className="mb-4" />
                    <blockquote className="font-editorial italic text-lg text-cream-soft/85 leading-relaxed flex-1">“{t.quote}”</blockquote>
                    <figcaption className="mt-6 pt-5 border-t border-gold/10">
                      <div className="font-title text-sm tracking-wide text-gold">{t.client_name}</div>
                      <div className="font-body text-xs text-cream-soft/45 mt-0.5">{t.client_role}</div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="section-base bg-charcoal text-center bg-lux-radial">
        <div className="container-lux max-w-3xl">
          <Reveal>
            <p className="eyebrow">Let's Begin</p>
            <h2 className="text-display-lg mt-4 text-balance">Ready to transform your space?</h2>
            <p className="mt-5 font-body text-cream-soft/60 leading-relaxed">
              Book a consultation with our design team and let's craft something extraordinary together.
            </p>
            <div className="mt-9 flex flex-wrap gap-4 justify-center">
              <Link to="/contact" className="btn-gold-solid">Book a Consultation <ArrowRight size={15} /></Link>
              <Link to="/bulk-orders" className="btn-outline-gold">Trade &amp; Bulk Enquiries</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
