import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Home as HomeIcon, Ruler, Palette, Sofa, Sparkles, MonitorSmartphone } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { usePricing } from '@/hooks/useData'
import { formatNaira } from '@/lib/utils'
import Meta from '@/components/Meta'

const ICONS = [HomeIcon, Ruler, Palette, Sofa, Sparkles, MonitorSmartphone]

const PROCESS = [
    { num: '01', title: 'Discovery Call', desc: 'A 30-minute consultation to discuss your vision, budget, and project scope.' },
    { num: '02', title: 'Concept Development', desc: 'We create mood boards and material palettes to define the design direction.' },
    { num: '03', title: 'Design Presentation', desc: '3D visualizations and detailed floor plans presented for your approval.' },
    { num: '04', title: 'Procurement & Build', desc: 'We source every piece and manage our trusted craftsmen during implementation.' },
    { num: '05', title: 'Installation & Reveal', desc: 'The final styling and "big reveal" of your transformed space.' },
]

const STYLES = [
    { name: 'Modern Luxury', desc: 'Clean lines, premium materials, and a focus on statement pieces.' },
    { name: 'Traditional', desc: 'Classic silhouettes, ornate details, and balanced proportions.' },
    { name: 'Transitional', desc: 'The best of both worlds — blending classic comfort with modern clarity.' },
    { name: 'Bohemian', desc: 'Global textures, layered patterns, and a relaxed, eclectic spirit.' },
    { name: 'Minimalist', desc: 'Less is more. Functional beauty, open spaces, and intentional living.' },
    { name: 'Maximalist', desc: 'Bold colors, rich textures, and meaningful collections on display.' },
]

export default function InteriorDecor() {
    const { openRequest } = useCart()
    const { pricing } = usePricing()
    const SERVICES = (pricing.services || []).map((s, i) => ({ ...s, icon: ICONS[i % ICONS.length] }))
    const PACKAGES = pricing.packages || []
    const quote = (service) => openRequest({ kind: 'quote', source: 'service', service })
    const requestPackage = (p) => openRequest({ kind: 'quote', source: 'package', service: `${p.name} design package`, package: p.name })
    const priceLabel = (p) => (p.price ? formatNaira(p.price) : (p.price_note || 'Custom'))
    return (
        <div>
            <Meta title="Interior Décor & Design Services — Maxims Interiors" description="Full room design, space planning, colour consultation, furniture sourcing and design packages from Maxims Interiors, Abuja." />
            <section className="page-hero min-h-[400px] sm:min-h-[460px] bg-purple-darkest">
                <div className="page-hero-overlay" style={{ background: 'linear-gradient(to bottom, rgba(59,31,107,0.7), rgba(28,13,53,0.9))' }} />
                <div className="page-hero-pattern" />
                <motion.div className="relative z-10 px-6 py-24 text-center max-w-[850px] mx-auto"
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
                    <p className="eyebrow mb-4" style={{ color: 'rgba(201,168,76,0.65)' }}>Expert Services</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-6">Interior Décor<br /><em className="text-gold-light italic">& Design</em></h1>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link to="/contact" className="btn-maxims btn-gold-solid">Book Consultation</Link>
                        <button onClick={() => quote('Interior design / consultation')} className="btn-maxims btn-outline-light">Request a Quote</button>
                        <a href="#packages" className="btn-maxims btn-outline-light">View Packages</a>
                    </div>
                </motion.div>
            </section>

            {/* Services */}
            <section className="section-base bg-cream-soft">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">Our Expertise</p>
                    <h2 className="text-display-md text-purple-rich dark:text-gold-light font-display">Design Services</h2>
                    <div className="gold-divider" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-[1200px] mx-auto">
                    {SERVICES.map((s, i) => (
                        <motion.div key={s.key || s.title} className="card-luxury p-7 sm:p-10 group relative"
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} viewport={{ once: true }}>
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gold scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                            <s.icon size={34} strokeWidth={1.4} className="text-gold mb-5" />
                            <h3 className="font-title text-[0.9rem] font-bold tracking-[0.14em] uppercase text-purple-rich dark:text-gold-light mb-3">{s.title}</h3>
                            <p className="font-body text-[0.98rem] text-charcoal-muted leading-relaxed mb-4">{s.description}</p>
                            {s.price_from ? <p className="font-body text-[0.95rem] font-bold text-gold-deep dark:text-gold mb-4">From {formatNaira(s.price_from)}</p> : null}
                            <button onClick={() => quote(s.title)} className="inline-flex items-center min-h-[44px] font-title text-[0.72rem] font-bold tracking-[0.16em] uppercase text-gold-deep dark:text-gold hover:text-purple-rich transition-colors">Request a Quote <ArrowRight size={13} className="inline ml-1.5" /></button>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Process */}
            <section className="section-base bg-charcoal-mid">
                <div className="section-header-center">
                    <p className="eyebrow mb-3" style={{ color: 'rgba(201,168,76,0.65)' }}>Our Method</p>
                    <h2 className="text-display-md text-gold-light font-display">The Design Process</h2>
                    <div className="gold-divider" />
                </div>
                <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-8 relative">
                    <div className="absolute top-[25px] left-0 right-0 h-px bg-gold/15 hidden md:block" />
                    {PROCESS.map((s, i) => (
                        <motion.div key={s.num} className="flex-1 text-center relative z-10"
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                            <div className="w-12 h-12 rounded-full border border-gold bg-charcoal-mid text-gold font-title text-sm flex items-center justify-center mx-auto mb-6">{s.num}</div>
                            <h3 className="font-title text-[0.7rem] tracking-[0.2em] uppercase text-cream-soft mb-3">{s.title}</h3>
                            <p className="font-body text-[0.78rem] text-cream-soft leading-relaxed">{s.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Styles */}
            <section className="section-base bg-cream">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">Aesthetic Range</p>
                    <h2 className="text-display-md text-purple-rich dark:text-gold-light font-display">Design Styles</h2>
                    <div className="gold-divider" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1000px] mx-auto">
                    {STYLES.map(s => (
                        <div key={s.name} className="p-6 border border-purple-rich/10 hover:border-gold hover:bg-gold/5 transition-all text-center group cursor-default">
                            <h3 className="font-editorial text-xl text-purple-rich dark:text-gold-light mb-2 group-hover:text-gold transition-colors">{s.name}</h3>
                            <p className="font-body text-[0.8rem] text-charcoal-muted">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing */}
            <section id="packages" className="section-base bg-cream-soft">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">Transparent Value</p>
                    <h2 className="text-display-md text-purple-rich dark:text-gold-light font-display">Pricing Packages</h2>
                    <div className="gold-divider" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1100px] mx-auto">
                    {PACKAGES.map(p => (
                        <motion.div key={p.name} className={`relative p-7 sm:p-10 lg:p-12 border flex flex-col ${p.featured ? 'bg-purple-rich border-gold shadow-gold-lg' : 'bg-card border-purple-rich/10'}`}
                            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            {p.featured && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold text-purple-darkest font-title text-[0.7rem] font-bold tracking-[0.22em] uppercase py-2 px-4 whitespace-nowrap">Most Popular</div>}
                            <h3 className={`font-title text-[0.9rem] font-bold tracking-[0.24em] uppercase mb-2 ${p.featured ? 'text-gold' : 'text-purple-rich dark:text-gold-light'}`}>{p.name}</h3>
                            <div className={`font-editorial font-bold text-4xl mb-8 ${p.featured ? 'text-cream-soft' : 'text-charcoal'}`}>{priceLabel(p)}</div>
                            <ul className="space-y-3.5 mb-10 flex-1">
                                {(p.features || []).map(f => (
                                    <li key={f} className={`flex gap-3 items-start font-body text-[0.98rem] ${p.featured ? 'text-cream-soft' : 'text-charcoal-muted'}`}>
                                        <Check size={16} className="text-gold shrink-0 mt-1" /> {f}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => (p.price ? requestPackage(p) : quote(`${p.name} design package`))} className={`btn-maxims w-full justify-center ${p.featured ? 'btn-gold-solid' : 'btn-purple-solid'}`}>{p.price ? 'Request this package' : 'Request a Quote'}</button>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    )
}
