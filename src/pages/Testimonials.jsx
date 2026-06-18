// src/pages/Testimonials.jsx
import { Link } from 'react-router-dom'
import { Quote } from 'lucide-react'
import Meta from '@/components/Meta'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import Stars from '@/components/ui/Stars'
import { useTestimonials, useDashboardStats } from '@/hooks/useData'

export default function Testimonials() {
  const { data: testis, loading } = useTestimonials({ published: true })
  const { stats } = useDashboardStats()

  const projectCount = stats?.orders?.total ? `${stats.orders.total}+` : '200+'

  return (
    <>
      <Meta title="Testimonials — Maxims Interiors" description="What our clients say about working with Maxims Interiors & Home Goods." />
      <PageHero
        eyebrow="Kind Words"
        title="Trusted by Nigeria's Finest"
        lead="The relationships we build matter as much as the spaces we create. Here's what our clients say."
      />

      {/* Stats bar */}
      <section className="bg-purple-darkest border-y border-gold/15">
        <div className="container-lux grid grid-cols-3 divide-x divide-gold/10">
          {[
            { value: projectCount, label: 'Projects Delivered' },
            { value: '8', label: 'Years of Trust' },
            { value: '4.9★', label: 'Average Rating' },
          ].map((s) => (
            <div key={s.label} className="py-10 text-center">
              <div className="font-display text-4xl sm:text-5xl text-gold">{s.value}</div>
              <div className="mt-2 font-body text-[0.65rem] sm:text-xs tracking-[0.15em] uppercase text-cream-soft/45">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-base bg-charcoal">
        <div className="container-lux">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-60" />)}
            </div>
          ) : testis.length === 0 ? (
            <p className="text-center font-body text-cream-soft/40 py-20">Testimonials coming soon.</p>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
              {testis.map((t, i) => (
                <Reveal key={t.id} delay={(i % 3) * 0.05} className="break-inside-avoid mb-6">
                  <figure className="card-glass p-8">
                    <Quote size={28} className="text-gold/30 mb-4" />
                    <Stars rating={t.rating} className="mb-4" />
                    <blockquote className="font-editorial italic text-lg text-cream-soft/85 leading-relaxed">“{t.quote}”</blockquote>
                    <figcaption className="mt-6 pt-5 border-t border-gold/10">
                      <div className="font-title text-sm tracking-wide text-gold">{t.client_name}</div>
                      <div className="font-body text-xs text-cream-soft/45 mt-0.5">{t.client_role}</div>
                      {t.project_type && <div className="font-body text-[0.7rem] text-cream-soft/30 mt-1">{t.project_type}</div>}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          )}

          <Reveal>
            <div className="text-center mt-14">
              <Link to="/contact" className="btn-gold-solid">Start Your Project</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
