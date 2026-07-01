// src/pages/ProductDetail.jsx
// Individual product page opened when a shop item is clicked.
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { getStorageUrl, BUCKETS } from '@/lib/storage'
import { formatNaira } from '@/lib/utils'
import { COLLECTIONS } from '@/lib/media'

export default function ProductDetail() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true); setNotFound(false)
    api.get('/products/' + slug)
      .then((p) => { if (alive) { setProduct(p); setActive(0) } })
      .catch(() => { if (alive) setNotFound(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [slug])

  const collection = COLLECTIONS.find((c) => c.slug === slug)
  const images = product ? [product.cover_image, ...(product.images || [])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) : []

  if (loading) return (
    <div className="min-h-[70vh] grid place-items-center bg-cream-soft">
      <div className="font-title text-sm tracking-widest text-gold animate-pulse">LOADING…</div>
    </div>
  )
  if (notFound || !product) return (
    <div className="min-h-[70vh] grid place-items-center bg-cream-soft text-center px-6">
      <div>
        <h1 className="font-display text-3xl text-purple-rich mb-3">Product not found</h1>
        <Link to="/shop" className="btn-maxims btn-gold-solid">Back to Shop</Link>
      </div>
    </div>
  )

  return (
    <div className="bg-cream-soft">
      <section className="section-base">
        <div className="max-w-[1150px] mx-auto">
          <Link to="/shop" className="inline-flex items-center gap-2 font-title text-[0.6rem] tracking-[0.2em] uppercase text-charcoal-muted hover:text-gold transition-colors mb-8">
            <ArrowLeft size={13} /> Back to Shop
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Media */}
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              <div className="aspect-square bg-gradient-to-br from-cream to-cream-dark overflow-hidden border border-gold/10">
                {collection ? (
                  <video src={collection.video} poster={collection.poster} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                ) : images[active] ? (
                  <img src={getStorageUrl(BUCKETS.products, images[active])} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-7xl opacity-25">🛋️</div>
                )}
              </div>
              {!collection && images.length > 1 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setActive(i)}
                      className={`w-16 h-16 overflow-hidden border ${i === active ? 'border-gold' : 'border-gold/15 opacity-70 hover:opacity-100'}`}>
                      <img src={getStorageUrl(BUCKETS.products, img)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Info */}
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              {product.badge && <span className="inline-block bg-gold text-purple-darkest font-body font-black text-[0.55rem] tracking-[0.12em] uppercase px-2.5 py-1 mb-4">{product.badge}</span>}
              <p className="eyebrow mb-2">{product.category}</p>
              <h1 className="font-display text-4xl text-purple-rich mb-4">{product.name}</h1>
              <div className="font-title text-2xl text-gold-deep font-semibold mb-6">{formatNaira(product.price)}</div>
              <p className="font-body text-[0.92rem] text-charcoal-muted leading-[1.9] mb-6">{product.description || 'A signature Maxims piece, crafted with care.'}</p>

              <div className="flex items-center gap-2 mb-8 font-body text-[0.8rem] text-charcoal-muted">
                <Check size={15} className="text-green-600" />
                {product.stock_qty > 0 ? `In stock${product.stock_qty <= 10 ? ` — only ${product.stock_qty} left` : ''}` : 'Made to order'}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/contact" className="btn-maxims btn-gold-solid">Enquire to Order <ArrowRight size={14} /></Link>
                <Link to="/shop" className="btn-maxims btn-outline-gold">Continue Shopping</Link>
              </div>

              <p className="font-body text-[0.72rem] text-charcoal-muted/70 mt-6 leading-relaxed">
                Prefer to talk it through? Message us on WhatsApp or book a consultation — we'll help you choose and arrange delivery.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
