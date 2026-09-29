import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, Filter, Check } from 'lucide-react'
import { useProducts } from '@/hooks/useData'
import { useCart } from '@/context/CartContext'
import { getStorageUrl, BUCKETS } from '@/lib/storage'
import CollectionShowcase from '@/components/CollectionShowcase'

const fmt = n => '₦' + Number(n).toLocaleString()
const badgeClass = (b) => b === 'New' || b === 'New Arrival' ? 'bg-gold text-purple-darkest' : b === 'Staff Pick' ? 'bg-purple-rich text-gold-light' : b === 'Sale' ? 'bg-red-700 text-white' : 'bg-charcoal text-white'

export default function Shop() {
    const navigate = useNavigate()
    const { data: products, loading } = useProducts({ status: 'active' })
    const [cat, setCat] = useState('All')
    const [sort, setSort] = useState('featured')
    const [wished, setWished] = useState([])
    const [added, setAdded] = useState(null)
    const { add } = useCart()

    const uniqueCats = ['All', ...new Set((products || []).map(p => p.category).filter(Boolean))]

    const shown = (products || [])
        .filter(p => cat === 'All' || p.category === cat)
        .sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : sort === 'featured' ? (b.is_featured ? 1 : -1) : 0)

    const addCart = p => {
        add(p)
        setAdded(p.id)
        setTimeout(() => setAdded(null), 2000)
    }

    return (
        <div>
            <section className="page-hero min-h-[380px]">
                <div className="page-hero-overlay" /><div className="page-hero-pattern" />
                <motion.div className="relative z-10 px-6 py-24 text-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
                    <p className="eyebrow mb-4 text-gold">Home Goods</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-4">Shop Collection</h1>
                    <div className="flex items-center justify-center gap-4 my-3">
                        <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, #C9A84C)' }} />
                        <span className="text-gold text-xs">✦</span>
                        <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, #C9A84C)' }} />
                    </div>
                    <p className="font-body text-cream-soft text-sm mt-2">Curated luxury for every corner of your home</p>
                </motion.div>
            </section>

            <section className="section-base bg-cream-soft">
                {/* Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 max-w-[1200px] mx-auto">
                    <div className="flex flex-wrap gap-2">
                        {uniqueCats.map(c => (
                            <button key={c} onClick={() => setCat(c)}
                                className={`font-title text-[0.76rem] tracking-[0.15em] uppercase px-4 py-2 border transition-all duration-200
                  ${cat === c ? 'bg-purple-rich text-gold-light border-purple-rich' : 'border-purple-rich/15 text-charcoal-muted hover:border-gold hover:text-gold'}`}
                            >{c}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 border border-purple-rich/12 px-3 py-2 bg-card">
                        <Filter size={12} className="text-charcoal-muted" />
                        <select value={sort} onChange={e => setSort(e.target.value)} className="font-body text-[0.8rem] text-charcoal-muted bg-transparent outline-none cursor-pointer">
                            <option value="featured">Featured</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>
                <p className="font-body text-[0.8rem] text-charcoal-muted mb-8 max-w-[1200px] mx-auto">{shown.length} products</p>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-[1200px] mx-auto">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="card-luxury animate-pulse p-4">
                                <div className="aspect-square bg-purple-rich/10 mb-4" />
                                <div className="space-y-3">
                                    <div className="h-2 w-1/4 bg-purple-rich/10 rounded" />
                                    <div className="h-4 w-3/4 bg-purple-rich/10 rounded" />
                                    <div className="flex justify-between items-center">
                                        <div className="h-3 w-1/3 bg-purple-rich/10 rounded" />
                                        <div className="h-8 w-8 bg-purple-rich/10 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-[1200px] mx-auto" layout>
                        <AnimatePresence mode='popLayout'>
                            {shown.map((p, i) => (
                                <motion.div key={p.id} className="card-luxury group cursor-pointer" layout
                                    onClick={() => navigate(`/shop/${p.slug}`)}
                                    initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
                                    transition={{ delay: i * 0.04, duration: 0.38 }} whileHover={{ y: -5 }}>
                                    <div className="relative aspect-square bg-gradient-to-br from-cream to-cream-dark flex items-center justify-center overflow-hidden">
                                        {p.cover_image ? (
                                            <img src={getStorageUrl(BUCKETS.products, p.cover_image)} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <ShoppingBag size={40} strokeWidth={1} className="text-gold/85 group-hover:scale-110 transition-transform duration-400" />
                                        )}
                                        {p.badge && <div className={`absolute top-2.5 left-2.5 font-body font-black text-[0.72rem] tracking-[0.12em] uppercase px-2 py-0.5 ${badgeClass(p.badge)}`}>{p.badge}</div>}
                                        <button onClick={(e) => { e.stopPropagation(); setWished(w => w.includes(p.id) ? w.filter(x => x !== p.id) : [...w, p.id]) }}
                                            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-card/85 flex items-center justify-center shadow">
                                            <Heart size={13} fill={wished.includes(p.id) ? '#C9A84C' : 'none'} color={wished.includes(p.id) ? '#C9A84C' : '#7A7890'} />
                                        </button>
                                        <div className="absolute inset-0 bg-purple-rich/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <button onClick={(e) => { e.stopPropagation(); addCart(p) }} className="btn-maxims btn-gold-solid text-[0.76rem] px-4 py-2">
                                                {added === p.id ? <><Check size={12} /> Added</> : 'Add to Cart'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="eyebrow text-[0.72rem] mb-1">{p.category}</p>
                                        <h3 className="font-editorial text-[0.88rem] text-charcoal mb-2 group-hover:text-gold transition-colors">{p.name}</h3>
                                        <div className="flex items-center justify-between">
                                            <span className="font-title text-[0.95rem] text-purple-rich dark:text-gold-light font-semibold">{fmt(p.price)}</span>
                                            <button onClick={(e) => { e.stopPropagation(); addCart(p) }} className="w-8 h-8 bg-purple-rich hover:bg-gold hover:text-purple-darkest dark:text-cream-soft text-gold-light flex items-center justify-center transition-colors">
                                                {added === p.id ? <Check size={13} /> : <ShoppingBag size={13} />}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

            </section>

            <CollectionShowcase className="bg-charcoal-mid" />

        </div>
    )
}
