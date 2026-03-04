import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGallery } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'

const GRADS = ['linear-gradient(135deg,#2E1660,#5B35A0)', 'linear-gradient(135deg,#1C0D35,#3B1F6B)', 'linear-gradient(135deg,#2A1850,#7B52C0)', 'linear-gradient(135deg,#12111A,#2E1660)', 'linear-gradient(135deg,#1E1C2C,#5B35A0)', 'linear-gradient(135deg,#2E1660,#1C0D35)']

export default function Gallery() {
    const { data: projects, loading } = useGallery({ published: true })
    const [f, setF] = useState('All')
    const [lb, setLb] = useState(null)
    const [lbi, setLbi] = useState(0)

    const uniqueCats = ['All', ...new Set((projects || []).map(p => p.category).filter(Boolean))]
    const shown = (projects || []).filter(p => f === 'All' || p.category === f)

    // Find one featured project for spotlight
    const spotlight = (projects || []).find(p => p.is_featured)
    const openLb = (p, i) => { setLb(p); setLbi(i) }
    const prev = () => { const ni = (lbi - 1 + shown.length) % shown.length; setLbi(ni); setLb(shown[ni]) }
    const next = () => { const ni = (lbi + 1) % shown.length; setLbi(ni); setLb(shown[ni]) }
    const sizeClass = s => s === 'large' ? 'col-span-2 row-span-2' : s === 'medium' ? 'col-span-2' : ''

    return (
        <div>
            <section className="page-hero min-h-[380px]">
                <div className="page-hero-overlay" /><div className="page-hero-pattern" />
                <motion.div className="relative z-10 px-6 py-24 text-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
                    <p className="eyebrow mb-4" style={{ color: 'rgba(201,168,76,0.65)' }}>Our Portfolio</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-4">Gallery</h1>
                    <div className="flex items-center justify-center gap-4 my-3">
                        <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, #C9A84C)' }} /><span className="text-gold text-xs">✦</span>
                        <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, #C9A84C)' }} />
                    </div>
                    <p className="font-body text-cream-soft text-sm mt-2">200+ completed projects across Nigeria</p>
                </motion.div>
            </section>

            <section className="section-base bg-cream-soft">
                <div className="flex flex-wrap gap-2 justify-center mb-10">
                    {uniqueCats.map(fi => (
                        <button key={fi} onClick={() => setF(fi)}
                            className={`font-title text-[0.58rem] tracking-[0.18em] uppercase px-4 py-2 border transition-all duration-200
                ${f === fi ? 'bg-purple-rich text-gold-light border-purple-rich' : 'border-purple-rich/12 text-charcoal-muted hover:border-gold hover:text-gold'}`}>
                            {fi}
                        </button>
                    ))}
                </div>

                <motion.div className="grid grid-cols-4 auto-rows-[200px] gap-3 max-w-[1200px] mx-auto" layout>
                    <AnimatePresence>
                        {loading && Array.from({ length: 4 }).map((_, i) => (
                            <motion.div key={`skel-${i}`} className={`relative overflow-hidden bg-purple-rich/10 animate-pulse col-span-2 ${i === 0 ? 'row-span-2' : ''}`} layout />
                        ))}
                        {shown.map((p, i) => (
                            <motion.div key={p.id} className={`relative overflow-hidden cursor-pointer group ${sizeClass(p.grid_size)}`} layout
                                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                                transition={{ delay: i * 0.04, duration: 0.38 }} onClick={() => openLb(p, i)}>
                                <div className="w-full h-full flex items-center justify-center transition-transform duration-700 group-hover:scale-105" style={{ background: GRADS[(p.sort_order || i) % GRADS.length] || '#1C0D35' }}>
                                    {p.cover_image ? (
                                        <img src={getStorageUrl(BUCKETS.gallery, p.cover_image)} alt={p.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <span className={`opacity-25 ${p.grid_size === 'large' ? 'text-7xl' : 'text-4xl'}`}>🏛️</span>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <p className="eyebrow text-gold mb-1">{p.category}</p>
                                    <h3 className="font-editorial text-base text-white font-normal mb-1">{p.title}</h3>
                                    <div className="flex items-center justify-between">
                                        <p className="font-body text-[0.68rem] text-cream-soft">📍 {p.location} · {p.year}</p>
                                        <ExternalLink size={13} className="text-gold/80" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* Spotlight */}
                {spotlight && (
                    <motion.div className="max-w-[1200px] mx-auto mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-cream p-12 border-l-4 border-gold"
                        initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <div className="aspect-[4/3] bg-gradient-to-br from-purple-rich to-purple-darkest flex items-center justify-center relative overflow-hidden">
                            {spotlight.cover_image ? (
                                <img src={getStorageUrl(BUCKETS.gallery, spotlight.cover_image)} alt={spotlight.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                            ) : (
                                <span className="text-8xl opacity-25">🏛️</span>
                            )}
                        </div>
                        <div>
                            <p className="eyebrow mb-3">Case Study</p>
                            <h2 className="text-display-md text-purple-rich dark:text-gold-light font-display mb-4">{spotlight.title}</h2>
                            <p className="font-body text-[0.88rem] text-charcoal-muted leading-relaxed mb-6">{spotlight.description || 'A comprehensive interior redesign spanning living, dining, and suite spaces. A cohesive statement of modern Nigerian luxury.'}</p>
                            <div className="grid grid-cols-2 gap-4">
                                {[['Location', spotlight.location || '-'], ['Size', spotlight.sqft || '-'], ['Duration', spotlight.duration || '-'], ['Year', spotlight.year || '-']].map(([l, v]) => (
                                    <div key={l}><p className="font-title text-[0.5rem] tracking-[0.25em] uppercase text-gold mb-0.5">{l}</p><p className="font-body text-[0.85rem] text-charcoal font-bold">{v}</p></div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                <div className="text-center mt-12">
                    <Link to="/contact" className="btn-maxims btn-gold-solid">Start Your Project</Link>
                </div>
            </section>

            {/* Lightbox */}
            <AnimatePresence>
                {lb && (
                    <motion.div className="fixed inset-0 z-[200] bg-charcoal/92 backdrop-blur-md flex items-center justify-center p-6"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLb(null)}>
                        <motion.div className="max-w-[600px] w-full bg-charcoal-mid border border-gold/18 relative"
                            initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 24 }}
                            onClick={e => e.stopPropagation()}>
                            <div className="aspect-video relative overflow-hidden flex snap-x snap-mandatory overflow-x-auto custom-scrollbar">
                                {[lb.cover_image, ...(lb.images || [])]
                                    .filter(Boolean)
                                    .map((img, i) => (
                                        <img key={i} src={getStorageUrl(BUCKETS.gallery, img)} alt="" loading="lazy" className="w-full h-full object-cover shrink-0 snap-center" />
                                    ))}
                                {!lb.cover_image && !(lb.images?.length) && (
                                    <div className="w-full h-full flex items-center justify-center shrink-0 snap-center" style={{ background: GRADS[(lb.sort_order || 0) % GRADS.length] || '#1C0D35' }}>
                                        <span className="text-9xl opacity-25">🏛️</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-8">
                                <p className="eyebrow text-gold mb-1">{lb.category}</p>
                                <h3 className="text-display-md text-cream-soft font-display mb-2">{lb.title}</h3>
                                <p className="font-body text-cream-soft">📍 {lb.location} · Completed {lb.year}</p>
                                <button className="absolute top-4 right-4 text-gold/60 hover:text-gold" onClick={() => setLb(null)}><X size={24} /></button>
                            </div>
                            <div className="absolute top-1/2 -left-16 -translate-y-1/2 hidden lg:block">
                                <button onClick={prev} className="w-12 h-12 rounded-full border border-gold/20 text-gold flex items-center justify-center hover:bg-gold/10 hover:border-gold transition-all"><ChevronLeft size={20} /></button>
                            </div>
                            <div className="absolute top-1/2 -right-16 -translate-y-1/2 hidden lg:block">
                                <button onClick={next} className="w-12 h-12 rounded-full border border-gold/20 text-gold flex items-center justify-center hover:bg-gold/10 hover:border-gold transition-all"><ChevronRight size={20} /></button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
