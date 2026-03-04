import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'

const SERVICES = [
    { icon: '🏠', title: 'Full Room Design', desc: 'Comprehensive design service for a single room, from concept to final reveal.' },
    { icon: '📏', title: 'Space Planning', desc: 'Optimizing the layout of your furniture and fixtures for maximum flow and function.' },
    { icon: '🎨', title: 'Color Consultation', desc: 'Expert palettes curated to set the right mood and coordinate with your existing architecture.' },
    { icon: '🛋️', title: 'Furniture Sourcing', desc: 'Access to exclusive trade-only collections and custom artisan furniture pieces.' },
    { icon: '✨', title: 'Home Staging', desc: 'Preparing your property for the market to maximize appeal and value.' },
    { icon: '💻', title: 'Virtual Design', desc: 'Professional design services delivered entirely online, nationwide.' },
]

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

const PACKAGES = [
    { name: 'Essence', price: '₦150,000', features: ['1.5hr Consultation', 'Color Palette', 'Mood Board', 'Shopping List'], featured: false },
    { name: 'Signature', price: '₦400,000', features: ['Full 2D Layout', '3D Visualizations', 'Trade Discounts', 'Project Tracking', 'Site Visits'], featured: true },
    { name: 'Prestige', price: 'Custom', features: ['Full-Service MGMT', 'Custom Furniture', 'Priority Support', 'Nationwide Travel'], featured: false },
]

export default function InteriorDecor() {
    return (
        <div>
            <section className="page-hero min-h-[460px] bg-purple-darkest">
                <div className="page-hero-overlay" style={{ background: 'linear-gradient(to bottom, rgba(59,31,107,0.7), rgba(28,13,53,0.9))' }} />
                <div className="page-hero-pattern" />
                <motion.div className="relative z-10 px-6 py-24 text-center max-w-[850px] mx-auto"
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
                    <p className="eyebrow mb-4" style={{ color: 'rgba(201,168,76,0.65)' }}>Expert Services</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-6">Interior Décor<br /><em className="text-gold-light italic">& Design</em></h1>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link to="/contact" className="btn-maxims btn-gold-solid">Book Consultation</Link>
                        <a href="#packages" className="btn-maxims btn-outline-light">View Packages</a>
                    </div>
                </motion.div>
            </section>

            {/* Services */}
            <section className="section-base bg-cream-soft">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">Our Expertise</p>
                    <h2 className="text-display-md text-purple-rich font-display">Design Services</h2>
                    <div className="gold-divider" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-[1200px] mx-auto">
                    {SERVICES.map((s, i) => (
                        <motion.div key={s.title} className="card-luxury p-10 group"
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} viewport={{ once: true }}>
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gold scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                            <div className="text-4xl mb-5">{s.icon}</div>
                            <h3 className="font-title text-[0.8rem] tracking-[0.2em] uppercase text-purple-rich mb-3">{s.title}</h3>
                            <p className="font-body text-[0.85rem] text-charcoal-muted leading-relaxed mb-6">{s.desc}</p>
                            <Link to="/contact" className="font-title text-[0.6rem] tracking-[0.2em] text-gold opacity-0 group-hover:opacity-100 transition-opacity">Enquire <ArrowRight size={10} className="inline ml-1" /></Link>
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
                            <p className="font-body text-[0.78rem] text-cream-soft/40 leading-relaxed">{s.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Styles */}
            <section className="section-base bg-cream">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">Aesthetic Range</p>
                    <h2 className="text-display-md text-purple-rich font-display">Design Styles</h2>
                    <div className="gold-divider" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1000px] mx-auto">
                    {STYLES.map(s => (
                        <div key={s.name} className="p-6 border border-purple-rich/10 hover:border-gold hover:bg-gold/5 transition-all text-center group cursor-default">
                            <h3 className="font-editorial text-xl text-purple-rich mb-2 group-hover:text-gold transition-colors">{s.name}</h3>
                            <p className="font-body text-[0.8rem] text-charcoal-muted">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing */}
            <section id="packages" className="section-base bg-cream-soft">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">Transparent Value</p>
                    <h2 className="text-display-md text-purple-rich font-display">Pricing Packages</h2>
                    <div className="gold-divider" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1100px] mx-auto">
                    {PACKAGES.map(p => (
                        <motion.div key={p.name} className={`relative p-12 border ${p.featured ? 'bg-purple-rich border-gold shadow-gold-lg' : 'bg-white border-purple-rich/10'}`}
                            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            {p.featured && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold text-purple-darkest font-title text-[0.55rem] tracking-[0.3em] uppercase py-2 px-4">Most Popular</div>}
                            <h3 className={`font-title text-[0.75rem] tracking-[0.3em] uppercase mb-2 ${p.featured ? 'text-gold' : 'text-purple-rich'}`}>{p.name}</h3>
                            <div className={`font-editorial text-4xl mb-8 ${p.featured ? 'text-cream-soft' : 'text-charcoal'}`}>{p.price}</div>
                            <ul className="space-y-4 mb-10">
                                {p.features.map(f => (
                                    <li key={f} className={`flex gap-3 items-center font-body text-[0.82rem] ${p.featured ? 'text-cream-soft/60' : 'text-charcoal-muted'}`}>
                                        <Check size={14} className="text-gold shrink-0" /> {f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/contact" className={`btn-maxims w-full justify-center ${p.featured ? 'btn-gold-solid' : 'btn-purple-solid'}`}>Get Started</Link>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    )
}
