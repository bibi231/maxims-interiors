import { motion } from 'framer-motion'
import { Linkedin, Mail, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTeamMembers } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'

export default function Team() {
    const { data: team, loading } = useTeamMembers(true)
    return (
        <div>
            <section className="page-hero min-h-[400px]">
                <div className="page-hero-overlay" /><div className="page-hero-pattern" />
                <motion.div className="relative z-10 px-6 py-24 text-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
                    <p className="eyebrow mb-4" style={{ color: 'rgba(201,168,76,0.65)' }}>The Visionaries</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-4">Our Team</h1>
                    <div className="gold-divider" />
                    <p className="font-body text-cream-soft text-sm mt-4">The artisans and experts behind the Maxims brand</p>
                </motion.div>
            </section>

            <section className="section-base bg-cream-soft">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1200px] mx-auto">
                    {loading && Array.from({ length: 6 }).map((_, i) => (
                        <div key={`skel-${i}`} className="card-luxury p-10 animate-pulse">
                            <div className="aspect-square lg:aspect-[4/5] bg-purple-rich/10 mb-8" />
                            <div className="h-6 w-3/4 bg-purple-rich/10 mb-2 rounded" />
                            <div className="h-3 w-1/2 bg-purple-rich/10 mb-5 rounded" />
                            <div className="space-y-2">
                                <div className="h-2.5 w-full bg-purple-rich/10 rounded" />
                                <div className="h-2.5 w-full bg-purple-rich/10 rounded" />
                                <div className="h-2.5 w-4/5 bg-purple-rich/10 rounded" />
                            </div>
                        </div>
                    ))}
                    {(team || []).map((t, i) => (
                        <motion.div key={t.id} className="card-luxury p-10 group"
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}>
                            <div className="relative mb-8 aspect-square lg:aspect-[4/5] bg-gradient-to-br from-purple-rich to-purple-darkest flex items-center justify-center overflow-hidden">
                                {t.avatar_url ? (
                                    <img src={getStorageUrl(BUCKETS.team, t.avatar_url)} alt={t.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 scale-100 group-hover:scale-105" />
                                ) : (
                                    <span className="text-8xl grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-500 scale-100 group-hover:scale-110">👩‍🎨</span>
                                )}
                                <div className="absolute inset-0 bg-gold/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-5 left-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all">
                                    <a href={t.linkedin_url || '#'} className="w-9 h-9 bg-card flex items-center justify-center text-purple-rich dark:text-gold-light hover:bg-gold hover:text-purple-darkest dark:text-cream-soft transition-colors z-10"><Linkedin size={14} /></a>
                                    <a href={`mailto:${t.email || ''}`} className="w-9 h-9 bg-card flex items-center justify-center text-purple-rich dark:text-gold-light hover:bg-gold hover:text-purple-darkest dark:text-cream-soft transition-colors z-10"><Mail size={14} /></a>
                                </div>
                            </div>
                            <h3 className="font-editorial text-2xl text-charcoal mb-1">{t.name}</h3>
                            <p className="font-title text-[0.6rem] tracking-[0.25em] uppercase text-gold mb-4">{t.role}</p>
                            <p className="font-body text-[0.82rem] text-charcoal-muted leading-relaxed">{t.bio}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Join the team */}
            <section className="section-base bg-cream text-center">
                <motion.div className="max-w-[700px] mx-auto p-16 border-2 border-dashed border-purple-rich/10"
                    initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                    <h2 className="text-display-md text-purple-rich dark:text-gold-light font-display mb-6">Join Our Vision</h2>
                    <p className="font-body text-[0.88rem] text-charcoal-muted mb-10 leading-relaxed">
                        We're always looking for talented designers, project managers, and creative spirits. Think you'd be a good fit for Maxims?
                    </p>
                    <Link to="/contact" className="btn-maxims btn-outline-gold">View Careers <ArrowRight size={14} /></Link>
                </motion.div>
            </section>
        </div >
    )
}
