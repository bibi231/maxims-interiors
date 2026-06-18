// src/pages/Team.jsx
import { Instagram, Linkedin } from 'lucide-react'
import Meta from '@/components/Meta'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import SmartImage from '@/components/ui/SmartImage'
import { useTeamMembers } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'

export default function Team() {
  const { data: members, loading } = useTeamMembers(true)

  return (
    <>
      <Meta title="Our Team — Maxims Interiors" description="The designers, project managers, and craftspeople behind Maxims Interiors & Home Goods." />
      <PageHero
        eyebrow="The People"
        title="The Hands Behind the Work"
        lead="A close-knit studio of designers, project managers, and makers — united by an obsession with detail."
      />

      <section className="section-base bg-charcoal pt-10">
        <div className="container-lux">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}><div className="skeleton aspect-[3/4]" /><div className="skeleton h-4 w-2/3 mt-3" /></div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-center font-body text-cream-soft/40 py-20">Our team profiles are coming soon.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {members.map((m, i) => (
                <Reveal key={m.id} delay={(i % 4) * 0.05}>
                  <article className="group">
                    <div className="relative overflow-hidden">
                      <SmartImage src={getStorageUrl(BUCKETS.team, m.photo_url)} alt={m.full_name} fallback="👤" ratio="3/4"
                        className="transition-transform duration-700 ease-luxe group-hover:scale-105" />
                      {(m.instagram || m.linkedin) && (
                        <div className="absolute bottom-0 inset-x-0 p-4 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-charcoal/90 to-transparent">
                          {m.instagram && <a href={m.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-cream-soft/80 hover:text-gold"><Instagram size={16} /></a>}
                          {m.linkedin && <a href={m.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-cream-soft/80 hover:text-gold"><Linkedin size={16} /></a>}
                        </div>
                      )}
                    </div>
                    <h3 className="mt-3 font-editorial text-lg text-cream-soft group-hover:text-gold transition-colors">{m.full_name}</h3>
                    <p className="font-body text-[0.7rem] tracking-[0.15em] uppercase text-gold/70">{m.title}</p>
                    {m.bio && <p className="mt-2 font-body text-sm text-cream-soft/50 leading-relaxed">{m.bio}</p>}
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
