import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, Heart, Star, Users } from 'lucide-react'
import { useTeamMembers } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'

const VALUES = [
    { icon: Award, title: 'Excellence', desc: 'We hold every project to an uncompromising standard — from concept to installation.' },
    { icon: Heart, title: 'Passion', desc: 'Interior design is our calling. We pour genuine love and artistry into every space.' },
    { icon: Users, title: 'Personalization', desc: 'No two clients are alike. We listen deeply and design spaces authentically, uniquely yours.' },
    { icon: Star, title: 'Elegance', desc: 'Luxury isn\'t just aesthetic — it\'s a feeling of intentional refinement in every detail.' },
]

const TIMELINE = [
    { year: '2016', event: 'Maxims founded in Abuja with a vision for accessible luxury design.' },
    { year: '2018', event: 'Expanded to Lagos. First commercial project: Meridian Boutique Hotel.' },
    { year: '2020', event: 'Launched our Home Goods collection with 50+ curated products.' },
    { year: '2022', event: 'Trade & Bulk program introduced. Now serving hotels and developers nationally.' },
    { year: '2024', event: '200+ completed projects. Recognized as one of Nigeria\'s top design firms.' },
]

export default function About() {
    const { data: teamRaw, loading } = useTeamMembers(true)
    const team = (teamRaw || []).slice(0, 3)
    return (
        <div>
            {/* Hero */}
            <section className="page-hero min-h-[420px]">
                <div className="page-hero-overlay" />
                <div className="page-hero-pattern" />
                <motion.div
                    className="relative z-10 px-6 py-24 text-center"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.75 }}
                >
                    <p className="eyebrow mb-4" style={{ color: 'rgba(201,168,76,0.65)' }}>Who We Are</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-4">Our Story</h1>
                    <div className="flex items-center justify-center gap-4 my-3">
                        <div className="h-px flex-1 max-w-[60px]" style={{ background: 'linear-gradient(to right, transparent, #C9A84C)' }} />
                        <span className="text-gold text-xs">✦</span>
                        <div className="h-px flex-1 max-w-[60px]" style={{ background: 'linear-gradient(to left, transparent, #C9A84C)' }} />
                    </div>
                    <p className="font-body text-cream-soft/45 max-w-md mx-auto leading-relaxed text-sm">
                        Born from a passion for beauty and the belief that everyone deserves a space they love
                    </p>
                </motion.div>
            </section>

            {/* Founder Story */}
            <section className="section-base bg-cream-soft">
                <div className="max-w-[1150px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-24 items-center">
                    <motion.div className="relative" initial={{ opacity: 0, x: -36 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
                        <div className="aspect-[3/4] bg-gradient-to-br from-purple-rich to-purple-darkest flex items-center justify-center">
                            <span className="text-9xl opacity-20">👩🎨</span>
                        </div>
                        <div className="absolute -bottom-4 -right-4 w-20 h-20 border-r-2 border-b-2 border-gold/40" />
                        <div className="absolute -top-4 -left-4 w-20 h-20 border-l-2 border-t-2 border-gold/40" />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 36 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
                        <p className="eyebrow mb-4">Founder's Note</p>
                        <h2 className="text-display-md text-purple-rich font-display mb-6">
                            A Letter From<br /><em className="italic">Our Founder</em>
                        </h2>
                        <p className="font-body text-[0.93rem] text-charcoal-muted/70 leading-[1.9] mb-4">
                            I started Maxims from a single belief: that beautiful spaces are not a luxury for the few — they are a right for everyone who wants to live with intention.
                        </p>
                        <p className="font-body text-[0.93rem] text-charcoal-muted/70 leading-[1.9] mb-4">
                            Growing up in Abuja, I was always captivated by how a room could make you feel — how light, texture, and proportion could transform mood and meaning. I studied design, returned home, and built the team that became Maxims.
                        </p>
                        <p className="font-body text-[0.93rem] text-charcoal-muted/70 leading-[1.9] mb-8">
                            Today, we've completed over 200 projects across Nigeria. But what we're most proud of are the clients who write to us months later, saying their home has changed their life.
                        </p>
                        <blockquote className="border-l-2 border-gold pl-5 font-editorial text-[1rem] italic text-purple-mid leading-relaxed">
                            "Design is not decoration. It is a language. And we are here to help you speak it fluently."
                            <cite className="block mt-2 font-title text-[0.62rem] not-italic tracking-[0.2em] text-gold">— Christine Namicit Gadzama, Founder</cite>
                        </blockquote>
                    </motion.div>
                </div>
            </section>

            {/* Mission & Values */}
            <section className="section-base bg-cream">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">Our Foundation</p>
                    <h2 className="text-display-md text-purple-rich font-display">Mission & Values</h2>
                    <div className="gold-divider" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1100px] mx-auto">
                    {VALUES.map(({ icon: Icon, title, desc }, i) => (
                        <motion.div
                            key={title}
                            className="card-luxury p-8 text-center group"
                            initial={{ opacity: 0, y: 22 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.09 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -5 }}
                        >
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold-deep via-gold to-gold-bright scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                            <Icon size={22} className="text-gold mx-auto mb-4" />
                            <h3 className="font-title text-[0.72rem] tracking-[0.2em] uppercase text-purple-rich mb-3">{title}</h3>
                            <p className="font-body text-[0.82rem] text-charcoal-muted/60 leading-relaxed">{desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Timeline */}
            <section className="section-base bg-charcoal-mid">
                <div className="section-header-center">
                    <p className="eyebrow mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>Our Journey</p>
                    <h2 className="text-display-md text-gold-light font-display">Milestones</h2>
                    <div className="gold-divider" />
                </div>
                <div className="relative max-w-[750px] mx-auto">
                    {/* Center line */}
                    <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-px" style={{ background: 'linear-gradient(to bottom, transparent, #C9A84C, transparent)' }} />
                    {TIMELINE.map((item, i) => (
                        <motion.div
                            key={item.year}
                            className={`flex items-center mb-10 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.65 }}
                            viewport={{ once: true }}
                        >
                            <div className={`w-[calc(50%-2rem)] ${i % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                                <div className="border border-gold/15 bg-white/4 p-5 hover:border-gold/35 transition-colors">
                                    <div className="font-title text-lg text-gold font-semibold mb-2">{item.year}</div>
                                    <p className="font-body text-[0.82rem] text-cream-soft/50 leading-relaxed">{item.event}</p>
                                </div>
                            </div>
                            <div className="w-3 h-3 rounded-full bg-gold border-2 border-charcoal-mid z-10 shrink-0 mx-[calc(1rem-1.5px)]" />
                            <div className="w-[calc(50%-2rem)]" />
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Team Teaser */}
            <section className="section-base bg-cream">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">The People</p>
                    <h2 className="text-display-md text-purple-rich font-display">Meet the Team</h2>
                    <div className="gold-divider" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[750px] mx-auto">
                    {loading && Array.from({ length: 3 }).map((_, i) => (
                        <div key={`skel-${i}`} className="card-luxury p-8 text-center animate-pulse">
                            <div className="w-20 h-20 rounded-full bg-purple-rich/10 mx-auto mb-4" />
                            <div className="w-3/4 h-3 bg-purple-rich/10 mx-auto mb-2 rounded" />
                            <div className="w-1/2 h-2 bg-purple-rich/10 mx-auto rounded" />
                        </div>
                    ))}
                    {team.map((t, i) => (
                        <motion.div
                            key={t.id}
                            className="card-luxury p-8 text-center group"
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -4 }}
                        >
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-cream to-cream-dark flex items-center justify-center">
                                {t.avatar_url ? (
                                    <img src={getStorageUrl(BUCKETS.team, t.avatar_url)} alt={t.name} loading="lazy" className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
                                ) : (
                                    <span className="text-4xl flex items-center justify-center w-full h-full opacity-30">👩‍🎨</span>
                                )}
                            </div>
                            <h3 className="font-editorial text-[0.95rem] text-charcoal mb-1">{t.name}</h3>
                            <p className="font-title text-[0.58rem] tracking-[0.2em] uppercase text-gold">{t.role}</p>
                        </motion.div>
                    ))}
                </div>
                <div className="text-center mt-10">
                    <Link to="/team" className="btn-maxims btn-gold-solid">Meet Full Team <ArrowRight size={14} /></Link>
                </div>
            </section>

            {/* CTA */}
            <section className="section-base bg-purple-rich relative overflow-hidden text-center">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.08), transparent 65%)' }} />
                <motion.div className="relative z-10" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <p className="eyebrow mb-5" style={{ color: 'rgba(201,168,76,0.55)' }}>Work With Us</p>
                    <h2 className="text-display-md text-cream-soft font-display mb-8">
                        Ready to Start<br /><em className="text-gold-light italic">Your Project?</em>
                    </h2>
                    <Link to="/contact" className="btn-maxims btn-gold-solid">Book a Consultation <ArrowRight size={14} /></Link>
                </motion.div>
            </section>
        </div>
    )
}
