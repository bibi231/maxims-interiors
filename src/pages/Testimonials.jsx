import { motion } from 'framer-motion'
import { Star, Quote, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTestimonials } from '@/hooks/useData'

export default function Testimonials() {
    const { data: reviews, loading } = useTestimonials({ published: true })
    return (
        <div>
            <section className="page-hero min-h-[400px]">
                <div className="page-hero-overlay" /><div className="page-hero-pattern" />
                <motion.div className="relative z-10 px-6 py-24 text-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
                    <p className="eyebrow mb-4" style={{ color: 'rgba(201,168,76,0.65)' }}>Client Love</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-4">Reviews & Stories</h1>
                    <div className="gold-divider" />
                    <p className="font-body text-cream-soft/45 text-sm mt-4">Hear from the people who live in the spaces we create</p>
                </motion.div>
            </section>

            <section className="section-base bg-cream-soft">
                <div className="max-w-[1200px] mx-auto columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                    {loading && Array.from({ length: 6 }).map((_, i) => (
                        <div key={`skel-${i}`} className="break-inside-avoid bg-white border border-purple-rich/5 p-8 animate-pulse">
                            <div className="h-8 w-8 bg-purple-rich/10 mb-6 rounded-full" />
                            <div className="space-y-3 mb-8">
                                <div className="h-3 w-full bg-purple-rich/10 rounded" />
                                <div className="h-3 w-full bg-purple-rich/10 rounded" />
                                <div className="h-3 w-3/4 bg-purple-rich/10 rounded" />
                            </div>
                            <div className="h-2 w-1/3 bg-purple-rich/10 mb-2 rounded" />
                            <div className="h-2 w-1/4 bg-purple-rich/10 rounded" />
                        </div>
                    ))}
                    {(reviews || []).map((r, i) => (
                        <motion.div key={r.id} className="break-inside-avoid bg-white border border-purple-rich/5 p-8 relative group"
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} viewport={{ once: true }}>
                            <div className="absolute top-0 left-0 w-1 h-full bg-gold scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                            <div className="flex items-center justify-between mb-6">
                                <div className="text-3xl grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all">✨</div>
                                <div className="flex gap-0.5">
                                    {Array(5).fill(0).map((_, j) => <Star key={j} size={12} fill={j < (r.rating || 5) ? '#C9A84C' : 'none'} color={j < (r.rating || 5) ? '#C9A84C' : '#D1D5DB'} />)}
                                </div>
                            </div>
                            <Quote className="text-gold opacity-10 mb-4" size={32} />
                            <p className="font-editorial text-[0.95rem] italic text-charcoal leading-relaxed mb-8">"{r.quote}"</p>
                            <div className="flex flex-col">
                                <span className="font-title text-[0.65rem] tracking-[0.2em] uppercase text-purple-rich">{r.client_name}</span>
                                <span className="font-body text-[0.65rem] text-charcoal-muted mt-1">{r.client_role}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            <section className="section-base bg-purple-rich text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #C9A84C 0px, #C9A84C 1px, transparent 1px, transparent 15px)' }} />
                <motion.div className="relative z-10" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <h2 className="text-display-md text-gold-light font-display mb-6">Want to Share Your Story?</h2>
                    <p className="font-body text-cream-soft/45 mb-10 max-w-md mx-auto">We love hearing from our clients. If we've worked together, please share your experience below.</p>
                    <Link to="/contact" className="btn-maxims btn-gold-solid">Submit a Review <ArrowRight size={14} /></Link>
                </motion.div>
            </section>
        </div>
    )
}
