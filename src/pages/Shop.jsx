// src/pages/Shop.jsx
import { useMemo, useState } from 'react'
import { ShoppingBag, Check } from 'lucide-react'
import Meta from '@/components/Meta'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import SmartImage from '@/components/ui/SmartImage'
import { useProducts } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'
import { formatNaira, cn } from '@/lib/utils'

const SORTS = [
  { key: 'featured', label: 'Featured' },
  { key: 'price-asc', label: 'Price: Low → High' },
  { key: 'price-desc', label: 'Price: High → Low' },
  { key: 'name', label: 'Name A–Z' },
]

export default function Shop() {
  const { data: products, loading } = useProducts({ status: 'active' })
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('featured')
  const [added, setAdded] = useState(null)

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products],
  )

  const visible = useMemo(() => {
    let list = category === 'All' ? products : products.filter((p) => p.category === category)
    list = [...list]
    switch (sort) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break
      case 'price-desc': list.sort((a, b) => b.price - a.price); break
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break
      default: list.sort((a, b) => Number(b.is_featured) - Number(a.is_featured)); break
    }
    return list
  }, [products, category, sort])

  function addToCart(p) {
    // TODO: Cart + Squad/Paystack checkout — cart is a future feature
    setAdded(p.id)
    setTimeout(() => setAdded(null), 1800)
  }

  return (
    <>
      <Meta title="Shop Luxury Home Goods — Maxims Interiors" description="Curated furniture, décor, lighting, and art. Luxury home goods delivered across Nigeria." />
      <PageHero
        eyebrow="The Collection"
        title="Shop Luxury Home Goods"
        lead="Curated furniture, décor, lighting, and art — each piece chosen for craft, character, and longevity."
      />

      <section className="section-base bg-charcoal pt-10">
        <div className="container-lux">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-10">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'font-title text-[0.62rem] tracking-[0.18em] uppercase px-4 py-2 border transition-colors',
                    category === c
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-cream-soft/15 text-cream-soft/55 hover:border-gold/50 hover:text-gold',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-charcoal-mid border border-cream-soft/15 text-cream-soft/70 font-body text-sm px-4 py-2.5 outline-none focus:border-gold"
            >
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton aspect-square" />
                  <div className="skeleton h-4 w-3/4 mt-3" />
                  <div className="skeleton h-3 w-1/3 mt-2" />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center font-body text-cream-soft/40 py-20">No products in this category yet. Check back soon.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {visible.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.05}>
                  <article className="group">
                    <div className="relative overflow-hidden">
                      <SmartImage
                        src={getStorageUrl(BUCKETS.products, p.cover_image)}
                        alt={p.name} fallback="🕯" ratio="1/1"
                        className="transition-transform duration-700 ease-luxe group-hover:scale-105"
                      />
                      {p.badge && (
                        <span className="absolute top-3 left-3 bg-gold text-purple-darkest font-title text-[0.55rem] tracking-[0.15em] uppercase px-2 py-1">{p.badge}</span>
                      )}
                      {p.compare_price && p.compare_price > p.price && (
                        <span className="absolute top-3 right-3 bg-red-500/90 text-cream-soft font-title text-[0.55rem] tracking-[0.1em] uppercase px-2 py-1">Sale</span>
                      )}
                      <button
                        onClick={() => addToCart(p)}
                        className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-purple-darkest/95 text-cream-soft font-title text-[0.6rem] tracking-[0.18em] uppercase py-3 flex items-center justify-center gap-2"
                      >
                        {added === p.id
                          ? <><Check size={14} className="text-gold" /> Added</>
                          : <><ShoppingBag size={14} /> Add to Cart</>}
                      </button>
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-editorial text-base text-cream-soft group-hover:text-gold transition-colors leading-tight">{p.name}</h3>
                        <p className="font-body text-[0.7rem] text-cream-soft/40 mt-0.5">{p.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-body text-sm text-gold/90">{formatNaira(p.price)}</p>
                        {p.compare_price && p.compare_price > p.price && (
                          <p className="font-body text-[0.7rem] text-cream-soft/30 line-through">{formatNaira(p.compare_price)}</p>
                        )}
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}

          <p className="mt-12 text-center font-body text-xs text-cream-soft/35">
            Online checkout is launching soon. To purchase today, {' '}
            <a href="/contact" className="text-gold hover:underline">contact our team</a>.
          </p>
        </div>
      </section>
    </>
  )
}
