import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGallery, useTestimonials, useProducts } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Star } from 'lucide-react'
import Hero3D from '@/components/sections/Hero3D'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards'
import { VelocityScroll } from '@/components/ui/velocity-scroll'

/* ────────── DATA ────────────────────────────────────── */
const SERVICES = [
    { icon: '🏛', label: 'Interior Design', desc: 'Full-service from concept to completion' },
    { icon: '🛋', label: 'Home Goods', desc: 'Curated luxury furniture & décor' },
    { icon: '📦', label: 'Bulk & Trade', desc: 'Volume pricing for hotels & developers' },
    { icon: '✦', label: 'Custom Décor', desc: 'Bespoke pieces crafted to your vision' },
    { icon: '📅', label: 'Consultations', desc: 'Expert design advice on your schedule' },
    { icon: '💻', label: 'Virtual Design', desc: 'Remote services, delivered nationwide' },
]

const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price);
};

const STATS = [['200+', 'Projects Completed'], ['150+', 'Happy Clients'], ['8', 'Years Experience'], ['4.9★', 'Avg. Rating']]

/* ────────── MARQUEE STRIP ───────────────────────────── */
function MarqueeStrip() {
    return (
        <div className="bg-purple-darkest overflow-hidden border-y border-gold/10 py-8">
            <VelocityScroll
                text="✦ MAXIMS INTERIORS ✦ LUXURY LIVING ✦ CUSTOM DÉCOR ✦ SPACE PLANNING ✦ "
                default_velocity={3}
                className="font-title text-2xl md:text-4xl tracking-[0.2em] uppercase text-gold/30"
            />
        </div>
    )
}

/* ────────── PAGE ────────────────────────────────────── */
export default function Home() {
    const { data: worksData } = useGallery({ published: true, featured: true })
    const { data: testimonialsData } = useTestimonials({ published: true, featured: true })
    const { data: productsData } = useProducts({ status: 'active', featured: true })

    const works = worksData?.slice(0, 5) || []
    const testimonials = testimonialsData?.slice(0, 3) || []
    const products = productsData?.slice(0, 4) || []

    return (
        <div className="bg-cream-soft">

            {/* ===== HERO ===== */}
            <section className="relative w-full min-h-screen bg-charcoal flex items-center justify-center overflow-hidden">
                <Hero3D />
                {/* Dark overlay */}
                <div className="absolute inset-0 z-[2]" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(59,31,107,0.4), rgba(18,17,26,0.72))' }} />
                {/* Bottom fade to page */}
                <div className="absolute bottom-0 left-0 right-0 h-48 z-[3]" style={{ background: 'linear-gradient(to bottom, transparent, #FAF7F2)' }} />

                {/* Content */}
                <div className="relative z-[10] text-center max-w-[820px] px-6 pt-20">
                    <motion.div
                        className="w-[78px] h-[78px] rounded-full border border-gold/60 flex items-center justify-center mx-auto mb-8"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 1, delay: 0.3, type: 'spring', stiffness: 75 }}
                        style={{ boxShadow: '0 0 30px rgba(201,168,76,0.25)' }}
                    >
                        <span className="font-title text-2xl font-bold text-gold">M</span>
                    </motion.div>

                    <motion.p className="eyebrow mb-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}>
                        ✦ &nbsp; Maxims Interiors & Home Goods &nbsp; ✦
                    </motion.p>

                    <motion.h1
                        className="text-display-xl text-cream-soft mb-6"
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.85 }}
                    >
                        Where Luxury<br /><em className="text-gold-light italic">Meets Living</em>
                    </motion.h1>

                    <motion.p
                        className="font-body text-base text-cream-soft/55 leading-relaxed mb-10 max-w-xl mx-auto"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1, duration: 0.7 }}
                    >
                        Transforming spaces into timeless experiences through refined design,<br className="hidden md:block" /> curated home goods, and artisan craftsmanship.
                    </motion.p>

                    <motion.div
                        className="flex gap-4 justify-center flex-wrap mb-16"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.3, duration: 0.7 }}
                    >
                        <Link to="/gallery" className="btn-maxims btn-gold-solid">
                            Explore Our Work <ArrowRight size={14} />
                        </Link>
                        <Link to="/contact" className="btn-maxims btn-outline-light">
                            Book Consultation
                        </Link>
                    </motion.div>

                    {/* Scroll indicator */}
                    <motion.div
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.2, duration: 1 }}
                    >
                        <span className="font-body text-[0.52rem] tracking-[0.4em] uppercase text-gold/40">Scroll</span>
                        <div className="w-px h-12 animate-scroll-pulse" style={{ background: 'linear-gradient(to bottom, #C9A84C, transparent)' }} />
                    </motion.div>
                </div>

                {/* Floating stat badges */}
                {[
                    { val: '200+', lbl: 'Projects', cls: 'bottom-[22%] left-[6%]', delay: 1.8 },
                    { val: '4.9★', lbl: 'Rating', cls: 'bottom-[28%] right-[6%]', delay: 2.0 },
                ].map(({ val, lbl, cls, delay }) => (
                    <motion.div
                        key={lbl}
                        className={`absolute z-[10] hidden md:block ${cls} bg-charcoal/70 border border-gold/25 backdrop-blur-sm px-5 py-3.5 text-center`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay, duration: 0.7 }}
                    >
                        <div className="font-title text-xl text-gold font-semibold">{val}</div>
                        <div className="font-body text-[0.58rem] tracking-[0.2em] uppercase text-cream-soft/40 mt-0.5">{lbl}</div>
                    </motion.div>
                ))}
            </section>

            <MarqueeStrip />

            {/* ===== SERVICES ===== */}
            <section className="section-base bg-cream">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">What We Do</p>
                    <h2 className="text-display-md text-purple-rich font-display">Our Services</h2>
                    <div className="gold-divider" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                    {SERVICES.map((s, i) => (
                        <motion.div
                            key={s.label}
                            className="card-luxury p-8 relative group"
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08, duration: 0.55 }}
                            viewport={{ once: true, amount: 0.15 }}
                            whileHover={{ y: -5 }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold-deep via-gold to-gold-bright scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                            <span className="text-3xl block mb-4">{s.icon}</span>
                            <h3 className="font-title text-[0.78rem] tracking-[0.18em] uppercase text-purple-rich mb-2.5">{s.label}</h3>
                            <p className="font-body text-[0.84rem] text-charcoal-muted/65 leading-relaxed mb-4">{s.desc}</p>
                            <Link to="/interior-decor" className="inline-flex items-center gap-1.5 font-title text-[0.6rem] tracking-[0.15em] uppercase text-gold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Enquire <ArrowRight size={11} />
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ===== FEATURED WORKS ===== */}
            <section className="section-base bg-cream-soft">
                <div className="flex items-end justify-between mb-12 max-w-[1200px] mx-auto">
                    <div>
                        <p className="eyebrow mb-2">Portfolio</p>
                        <h2 className="text-display-md text-purple-rich font-display">Featured Works</h2>
                        <div className="gold-divider-left" />
                    </div>
                    <Link to="/gallery" className="hidden sm:inline-flex btn-maxims btn-outline-gold">
                        View All <ArrowRight size={13} />
                    </Link>
                </div>

                <div className="max-w-[1200px] mx-auto">
                    <BentoGrid>
                        {works.map((w, i) => (
                            <BentoGridItem
                                key={w.id}
                                title={w.title}
                                description={w.category}
                                location={w.location}
                                className={w.grid_size === 'large' ? "md:col-span-1 md:row-span-2" : "md:col-span-1"}
                                badge={w.category}
                                header={
                                    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-dark to-purple-darkest overflow-hidden relative group-hover/bento:scale-[1.02] transition duration-200">
                                        {w.cover_image ? (
                                            <img src={getStorageUrl(BUCKETS.gallery, w.cover_image)} alt={w.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                                <span className="text-4xl text-gold">🏛</span>
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        ))}
                    </BentoGrid>
                </div>
            </section>

            {/* ===== ABOUT TEASER ===== */}
            <section className="section-base bg-charcoal-mid">
                <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-20">
                    {/* Visual */}
                    <motion.div
                        className="relative"
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <div className="aspect-[4/5] bg-gradient-to-br from-purple-rich to-purple-darkest flex items-center justify-center">
                            <span className="text-8xl opacity-20">🏛</span>
                        </div>
                        {/* Accent corners */}
                        <div className="absolute -top-3 -left-3 w-14 h-14 border-l-2 border-t-2 border-gold/50" />
                        <div className="absolute -bottom-3 -right-3 w-14 h-14 border-r-2 border-b-2 border-gold/50" />
                        {/* Badge */}
                        <div className="absolute -bottom-5 -right-5 bg-gold p-5 text-center">
                            <span className="font-title text-3xl text-purple-darkest font-bold block leading-none">8</span>
                            <span className="font-body text-[0.55rem] tracking-widest uppercase text-purple-rich font-bold block mt-1">Years of<br />Excellence</span>
                        </div>
                    </motion.div>

                    {/* Text */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <p className="eyebrow mb-4">Our Story</p>
                        <h2 className="text-display-md text-cream-soft font-display mb-1">
                            Crafting Spaces That<br />
                            <em className="text-gold-light italic">Reflect Who You Are</em>
                        </h2>
                        <div className="gold-divider-left mb-6" />
                        <p className="font-body text-[0.92rem] text-cream-soft/50 leading-[1.9] mb-6">
                            Maxims Interiors & Home Goods was born from a deep passion for transforming ordinary spaces into extraordinary living experiences. We blend timeless elegance with contemporary sensibility.
                        </p>
                        <blockquote className="border-l-2 border-gold pl-5 mb-8 font-editorial text-[1.05rem] italic text-gold-light leading-relaxed">
                            "Every room tells a story. We help you tell yours with beauty, intention, and lasting quality."
                        </blockquote>
                        <Link to="/about" className="btn-maxims btn-gold-solid">
                            Discover Our Story <ArrowRight size={14} />
                        </Link>
                    </motion.div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-gold/12 pt-12 max-w-[900px] mx-auto">
                    {STATS.map(([n, l], i) => (
                        <motion.div
                            key={l}
                            className="text-center px-4 py-5 border-r border-gold/8 last:border-r-0"
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <div className="font-title text-[clamp(1.8rem,3vw,2.5rem)] text-gold font-semibold mb-1">{n}</div>
                            <div className="font-body text-[0.65rem] tracking-[0.18em] uppercase text-cream-soft/30">{l}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ===== TESTIMONIALS ===== */}
            <section className="section-base bg-purple-rich relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(201,168,76,0.03) 0px, rgba(201,168,76,0.03) 1px, transparent 1px, transparent 20px)'
                }} />

                <div className="section-header-center relative z-10">
                    <p className="eyebrow mb-3" style={{ color: 'rgba(201,168,76,0.65)' }}>Client Words</p>
                    <h2 className="text-display-md text-gold-light font-display">What Our Clients Say</h2>
                    <div className="gold-divider" />
                </div>

                <div className="relative z-10 max-w-[1200px] mx-auto overflow-hidden">
                    <InfiniteMovingCards
                        items={testimonials.map(t => ({
                            quote: t.quote,
                            name: t.client_name,
                            title: t.client_role,
                        }))}
                        direction="right"
                        speed="slow"
                    />
                </div>
            </section>

            {/* ===== SHOP PREVIEW ===== */}
            <section className="section-base bg-cream">
                <div className="flex items-end justify-between mb-12 max-w-[1200px] mx-auto">
                    <div>
                        <p className="eyebrow mb-2">Home Goods</p>
                        <h2 className="text-display-md text-purple-rich font-display">Shop Our Collection</h2>
                        <div className="gold-divider-left" />
                    </div>
                    <Link to="/shop" className="hidden sm:inline-flex btn-maxims btn-outline-gold text-[0.62rem]">
                        Full Shop <ArrowRight size={13} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1200px] mx-auto">
                    {products.map((p, i) => (
                        <motion.div
                            key={p.id}
                            className="card-luxury group"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.09, duration: 0.55 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -6 }}
                        >
                            <div className="relative aspect-square bg-gradient-to-br from-cream to-cream-dark flex items-center justify-center overflow-hidden">
                                {p.cover_image ? (
                                    <img src={getStorageUrl(BUCKETS.products, p.cover_image)} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <span className="text-5xl group-hover:scale-110 transition-transform duration-400">🛋️</span>
                                )}
                                {p.badge && (
                                    <div className="absolute top-3 left-3 bg-gold text-purple-darkest font-body font-black text-[0.5rem] tracking-[0.12em] uppercase px-2 py-0.5">
                                        {p.badge}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-purple-rich/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {/* TODO: Cart + Paystack checkout */}
                                    <button className="btn-maxims btn-gold-solid text-[0.58rem] px-4 py-2">Add to Cart</button>
                                </div>
                            </div>
                            <div className="p-4">
                                <p className="eyebrow text-[0.52rem] mb-1.5">{p.category}</p>
                                <h3 className="font-editorial text-[0.88rem] text-charcoal mb-3">{p.name}</h3>
                                <div className="flex items-center justify-between">
                                    <span className="font-title text-[0.82rem] text-purple-rich font-semibold">{formatPrice(p.price)}</span>
                                    <button className="text-charcoal-muted/40 hover:text-gold transition-colors text-base">♡</button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ===== CTA BANNER ===== */}
            <section className="relative overflow-hidden py-36 px-8 text-center bg-charcoal-mid">
                <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(59,31,107,0.6), transparent 65%)' }} />
                <div className="absolute bottom-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.25), transparent 65%)' }} />

                <motion.div
                    className="relative z-10 max-w-[720px] mx-auto"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                >
                    <p className="eyebrow mb-6" style={{ color: 'rgba(201,168,76,0.6)' }}>Ready to Begin?</p>
                    <h2 className="text-display-lg text-cream-soft font-display mb-4">
                        Transform Your Space<br /><em className="text-gold-light italic">Into a Masterpiece</em>
                    </h2>
                    <p className="font-body text-[0.92rem] text-cream-soft/45 leading-relaxed mb-10 max-w-[520px] mx-auto">
                        Book your complimentary design consultation and take the first step toward your dream space.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link to="/contact" className="btn-maxims btn-gold-solid">
                            Book Free Consultation <ArrowRight size={14} />
                        </Link>
                        <Link to="/gallery" className="btn-maxims btn-outline-light">
                            View Portfolio
                        </Link>
                    </div>
                </motion.div>
            </section>
        </div>
    )
}
