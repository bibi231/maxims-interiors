// src/pages/About.jsx
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Meta from '@/components/Meta'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import SmartImage from '@/components/ui/SmartImage'
import { TIMELINE, VALUES, PROCESS } from '@/data/site'
import { useTeamMembers } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'

export default function About() {
  const { data: team } = useTeamMembers(true)
  const teaser = team.slice(0, 3)

  return (
    <>
      <Meta title="About — Maxims Interiors" description="Nearly a decade of refined Nigerian luxury. Meet the studio behind Maxims Interiors & Home Goods." />
      <PageHero
        eyebrow="Our Story"
        title="Nigerian Luxury, World-Class Craft"
        lead="Maxims was founded on a single, stubborn belief: that the spaces we live in should be as extraordinary as the lives we live in them."
      />

      {/* Founder quote */}
      <section className="section-base bg-charcoal-mid">
        <div className="container-lux max-w-4xl text-center">
          <Reveal>
            <div className="ornament-line mb-8"><span className="diamond">✦</span></div>
            <blockquote className="font-editorial italic text-2xl sm:text-3xl text-cream-soft/85 leading-snug text-balance">
              “We don't decorate rooms. We compose the feeling of coming home —
              and we never compromise on the details that make it last.”
            </blockquote>
            <p className="mt-6 font-title text-xs tracking-[0.2em] uppercase text-gold">Maxim Okafor · Founder</p>
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="section-base bg-charcoal">
        <div className="container-lux">
          <Reveal>
            <p className="eyebrow text-center">What Guides Us</p>
            <h2 className="text-display-md text-center mt-3">Our Values</h2>
            <div className="gold-divider" />
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <div className="card-glass h-full p-8 text-center">
                  <div className="font-display text-3xl text-gold mb-3">0{i + 1}</div>
                  <h3 className="font-editorial text-xl text-cream-soft mb-2">{v.title}</h3>
                  <p className="font-body text-sm text-cream-soft/55 leading-relaxed">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-base bg-charcoal-mid">
        <div className="container-lux max-w-4xl">
          <Reveal>
            <p className="eyebrow text-center">The Journey</p>
            <h2 className="text-display-md text-center mt-3">Our Milestones</h2>
            <div className="gold-divider" />
          </Reveal>
          <div className="mt-12 relative">
            <div className="absolute left-[7px] sm:left-1/2 top-0 bottom-0 w-px bg-gold/20" />
            <div className="space-y-10">
              {TIMELINE.map((t, i) => (
                <Reveal key={t.year} delay={i * 0.06}>
                  <div className={`relative pl-10 sm:pl-0 sm:grid sm:grid-cols-2 sm:gap-10 ${i % 2 ? 'sm:text-left' : 'sm:text-right'}`}>
                    <span className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-1.5 w-4 h-4 rounded-full bg-gold border-4 border-charcoal-mid" />
                    <div className={i % 2 ? 'sm:col-start-2' : 'sm:col-start-1'}>
                      <div className="font-display text-3xl text-gold">{t.year}</div>
                      <h3 className="font-editorial text-xl text-cream-soft mt-1">{t.title}</h3>
                      <p className="font-body text-sm text-cream-soft/55 mt-2 leading-relaxed">{t.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section-base bg-charcoal">
        <div className="container-lux">
          <Reveal>
            <p className="eyebrow text-center">How We Work</p>
            <h2 className="text-display-md text-center mt-3">From First Hello to Final Reveal</h2>
            <div className="gold-divider" />
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gold/10 mt-10">
            {PROCESS.map((p, i) => (
              <Reveal key={p.step} delay={i * 0.05}>
                <div className="card-glass h-full p-8">
                  <div className="font-display text-5xl text-gold/30">{p.step}</div>
                  <h3 className="font-editorial text-lg text-cream-soft mt-3">{p.title}</h3>
                  <p className="font-body text-sm text-cream-soft/55 mt-2 leading-relaxed">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Team teaser */}
      {teaser.length > 0 && (
        <section className="section-base bg-charcoal-mid">
          <div className="container-lux">
            <Reveal>
              <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                  <p className="eyebrow">The People</p>
                  <h2 className="text-display-md mt-3">Meet the Studio</h2>
                </div>
                <Link to="/team" className="btn-outline-gold">Full Team <ArrowRight size={15} /></Link>
              </div>
            </Reveal>
            <div className="grid sm:grid-cols-3 gap-6 mt-10">
              {teaser.map((m, i) => (
                <Reveal key={m.id} delay={i * 0.08}>
                  <div className="group">
                    <SmartImage src={getStorageUrl(BUCKETS.team, m.photo_url)} alt={m.full_name} fallback="👤" ratio="3/4" />
                    <h3 className="mt-3 font-editorial text-lg text-cream-soft group-hover:text-gold transition-colors">{m.full_name}</h3>
                    <p className="font-body text-xs tracking-wide text-gold/70 uppercase">{m.title}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
