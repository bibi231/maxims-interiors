import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, Filter, CreditCard, X } from 'lucide-react'
import { useProducts, placeOrder } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'

const fmt = n => '₦' + Number(n).toLocaleString()
const badgeClass = (b) => b === 'New' || b === 'New Arrival' ? 'bg-gold text-purple-darkest' : b === 'Staff Pick' ? 'bg-purple-rich text-gold-light' : b === 'Sale' ? 'bg-red-700 text-white' : 'bg-charcoal text-white'

export default function Shop() {
    const { data: products, loading } = useProducts({ status: 'active' })
    const [cat, setCat] = useState('All')
    const [sort, setSort] = useState('featured')
    const [wished, setWished] = useState([])
    const [added, setAdded] = useState(null)
    const [cart, setCart] = useState([])
    const [checkoutState, setCheckoutState] = useState('idle')

    const uniqueCats = ['All', ...new Set((products || []).map(p => p.category).filter(Boolean))]

    const shown = (products || [])
        .filter(p => cat === 'All' || p.category === cat)
        .sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : sort === 'featured' ? (b.is_featured ? 1 : -1) : 0)

    const addCart = p => {
        setCart([...cart, p]);
        setAdded(p.id);
        setTimeout(() => setAdded(null), 2000)
    }

    const handleCheckout = async () => {
        if (cart.length === 0) return
        setCheckoutState('processing')

        // STUB: Simulate Paystack Modal Delay
        await new Promise(r => setTimeout(r, 1500))
        const subtotal = cart.reduce((sum, item) => sum + item.price, 0)

        try {
            await placeOrder({
                customer_name: 'Guest User',
                customer_email: 'guest@example.com',
                customer_phone: '08000000000',
                delivery_address: '123 Victoria Island',
                city: 'Lagos',
                state: 'Lagos',
                subtotal: subtotal,
                delivery_fee: 10000,
                total: subtotal + 10000,
                payment_status: 'paid', // stubbed as paid
                status: 'pending',
                notes: 'Order placed via stubbed checkout',
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    qty: 1
                }))
            })
            setCheckoutState('success')
            setCart([])
            setTimeout(() => setCheckoutState('idle'), 3000)
        } catch (err) {
            console.error(err)
            setCheckoutState('error')
        }
    }

    return (
        <div>
            <section className="page-hero min-h-[380px]">
                <div className="page-hero-overlay" /><div className="page-hero-pattern" />
                <motion.div className="relative z-10 px-6 py-24 text-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
                    <p className="eyebrow mb-4" style={{ color: 'rgba(201,168,76,0.65)' }}>Home Goods</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-4">Shop Collection</h1>
                    <div className="flex items-center justify-center gap-4 my-3">
                        <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, #C9A84C)' }} />
                        <span className="text-gold text-xs">✦</span>
                        <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, #C9A84C)' }} />
                    </div>
                    <p className="font-body text-cream-soft/45 text-sm mt-2">Curated luxury for every corner of your home</p>
                </motion.div>
            </section>

            <section className="section-base bg-cream-soft">
                {/* Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 max-w-[1200px] mx-auto">
                    <div className="flex flex-wrap gap-2">
                        {uniqueCats.map(c => (
                            <button key={c} onClick={() => setCat(c)}
                                className={`font-title text-[0.58rem] tracking-[0.15em] uppercase px-4 py-2 border transition-all duration-200
                  ${cat === c ? 'bg-purple-rich text-gold-light border-purple-rich' : 'border-purple-rich/15 text-charcoal-muted hover:border-gold hover:text-gold'}`}
                            >{c}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 border border-purple-rich/12 px-3 py-2 bg-white">
                        <Filter size={12} className="text-charcoal-muted" />
                        <select value={sort} onChange={e => setSort(e.target.value)} className="font-body text-[0.72rem] text-charcoal-muted bg-transparent outline-none cursor-pointer">
                            <option value="featured">Featured</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>
                <p className="font-body text-[0.72rem] text-charcoal-muted mb-8 max-w-[1200px] mx-auto">{shown.length} products</p>

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
                                <motion.div key={p.id} className="card-luxury group" layout
                                    initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
                                    transition={{ delay: i * 0.04, duration: 0.38 }} whileHover={{ y: -5 }}>
                                    <div className="relative aspect-square bg-gradient-to-br from-cream to-cream-dark flex items-center justify-center overflow-hidden">
                                        {p.cover_image ? (
                                            <img src={getStorageUrl(BUCKETS.products, p.cover_image)} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <span className="text-5xl group-hover:scale-110 transition-transform duration-400">🛋️</span>
                                        )}
                                        {p.badge && <div className={`absolute top-2.5 left-2.5 font-body font-black text-[0.5rem] tracking-[0.12em] uppercase px-2 py-0.5 ${badgeClass(p.badge)}`}>{p.badge}</div>}
                                        <button onClick={() => setWished(w => w.includes(p.id) ? w.filter(x => x !== p.id) : [...w, p.id])}
                                            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/85 flex items-center justify-center shadow">
                                            <Heart size={13} fill={wished.includes(p.id) ? '#C9A84C' : 'none'} color={wished.includes(p.id) ? '#C9A84C' : '#7A7890'} />
                                        </button>
                                        <div className="absolute inset-0 bg-purple-rich/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <button onClick={() => addCart(p)} className="btn-maxims btn-gold-solid text-[0.55rem] px-4 py-2">
                                                {added === p.id ? '✓ Added!' : 'Add to Cart'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="eyebrow text-[0.52rem] mb-1">{p.category}</p>
                                        <h3 className="font-editorial text-[0.88rem] text-charcoal mb-2">{p.name}</h3>
                                        <div className="flex items-center justify-between">
                                            <span className="font-title text-[0.82rem] text-purple-rich font-semibold">{fmt(p.price)}</span>
                                            <button onClick={() => addCart(p)} className="w-8 h-8 bg-purple-rich hover:bg-gold hover:text-purple-darkest text-gold-light flex items-center justify-center transition-colors">
                                                <ShoppingBag size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Feature Banner */}
                <motion.div className="max-w-[1200px] mx-auto mt-16 bg-charcoal-mid border border-gold/12 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-8 p-12 relative overflow-hidden"
                    initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(59,31,107,0.4), transparent 60%)' }} />
                    <div className="relative z-10">
                        <p className="eyebrow mb-3" style={{ color: 'rgba(201,168,76,0.65)' }}>Staff Pick of the Season</p>
                        <h2 className="text-display-md text-cream-soft font-display mb-3">The Elara Collection</h2>
                        <p className="font-body text-[0.88rem] text-cream-soft/45 leading-relaxed mb-5 max-w-md">
                            Our bestselling living room series — handcrafted velvet chairs, sculptural side tables, and curated accent pieces.
                        </p>
                        <button className="btn-maxims btn-gold-solid">Shop the Collection</button>
                    </div>
                    <div className="text-8xl opacity-25 hidden md:block">🛋️</div>
                </motion.div>
            </section>

            {/* Floating Cart Stub */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 bg-purple-rich border border-gold/20 p-5 shadow-2xl z-50 flex items-center gap-6"
                    >
                        <div className="text-white">
                            <div className="font-title text-[0.6rem] tracking-widest uppercase text-gold mb-1">Your Cart</div>
                            <div className="font-body text-sm font-semibold">{cart.length} item{cart.length !== 1 ? 's' : ''} <span className="text-white/50 mx-2">|</span> {fmt(cart.reduce((s, p) => s + p.price, 0))}</div>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={checkoutState === 'processing'}
                            className="btn-maxims btn-gold-solid flex items-center gap-2 disabled:opacity-50"
                        >
                            <CreditCard size={14} />
                            {checkoutState === 'processing' ? 'Processing...' : checkoutState === 'success' ? 'Order Placed!' : 'Paystack Checkout'}
                        </button>
                        <button onClick={() => setCart([])} className="absolute -top-3 -right-3 w-6 h-6 bg-charcoal rounded-full border border-gold/20 text-cream-soft flex items-center justify-center hover:text-gold hover:border-gold transition-colors">
                            <X size={12} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
