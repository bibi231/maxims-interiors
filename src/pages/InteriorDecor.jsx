// src/pages/InteriorDecor.jsx
import { Link } from 'react-router-dom'
import { ArrowRight, Sofa, Building2, Lightbulb, Palette, Ruler, Truck, Check } from 'lucide-react'
import Meta from '@/components/Meta'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import { SERVICES, PROCESS } from '@/data/site'

const ICONS = { Sofa, Building2, Lightbulb, Palette, Ruler, Truck }

const INCLUDES = [
  'On-site consultation & detailed brief',
  'Concept boards, palettes & material samples',
  '3D visualisation of key spaces',
  'Full sourcing & procurement management',
  'Project management & trade coordination',
  'White-glove installation & final styling',
]

export default function InteriorDecor() {
  return (
    <>
      <Meta title="Interior Decor & Design Services — Maxims Interiors" description="Full-service luxury interior design for homes, hotels, and commercial spaces in Nigeria." />
      <PageHero
        eyebrow="Design Services"
        title="Interior Decor, Done Beautifully"
        lead="Full-service design for residential and commercial spaces — handled end to end, so you simply enjoy the reveal."
      />

      {/* Services grid */}
      <section className="section-base bg-charcoal pt-10">
        <div className="container-lux">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gold/10">
            {SERVICES.map((s, i) => {
              const Icon = ICONS[s.icon] ?? Sofa
              return (
                <Reveal key={s.title} delay={(i % 3) * 0.05}>
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

      {/* What's included */}
      <section className="section-base bg-charcoal-mid">
        <div className="container-lux grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <p className="eyebrow">The Full Service</p>
            <h2 className="text-display-md mt-3 text-balance">Everything handled, end to end</h2>
            <p className="mt-5 font-body text-cream-soft/60 leading-relaxed">
              A Maxims engagement is comprehensive. From the first conversation to the final
              cushion placed, our team manages every moving part — so the process feels as
              effortless as the result looks.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <ul className="space-y-3">
              {INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-3 card-glass px-5 py-4">
                  <Check size={18} className="text-gold shrink-0 mt-0.5" />
                  <span className="font-body text-sm text-cream-soft/75">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Process */}
      <section className="section-base bg-charcoal">
        <div className="container-lux">
          <Reveal>
            <p className="eyebrow text-center">The Process</p>
            <h2 className="text-display-md text-center mt-3">Four Considered Steps</h2>
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

      {/* CTA */}
      <section className="section-base bg-purple-darkest text-center">
        <div className="container-lux max-w-3xl">
          <Reveal>
            <h2 className="text-display-lg text-balance">Let's design your space</h2>
            <p className="mt-5 font-body text-cream-soft/60">Book a consultation and tell us about your vision.</p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Link to="/contact" className="btn-gold-solid">Book a Consultation <ArrowRight size={15} /></Link>
              <Link to="/gallery" className="btn-outline-light">See Our Work</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
