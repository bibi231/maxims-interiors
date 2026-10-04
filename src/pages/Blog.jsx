// src/pages/Blog.jsx
// Public Journal: /blog (list, tag filter) and /blog/:slug (post).
// Post HTML is sanitised by the API (allowlist) before it reaches here.
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import Meta from '@/components/Meta'
import { api } from '@/lib/api'

const SITE = 'https://maximsinterior.com.ng'
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

function PostCard({ p, large = false }) {
  return (
    <Link to={`/blog/${p.slug}`} className={`group block bg-card border border-purple-rich/10 hover:border-gold/50 transition-colors h-full ${large ? 'md:grid md:grid-cols-2' : ''}`}>
      <div className={`overflow-hidden bg-purple-darkest ${large ? 'aspect-[16/10] md:aspect-auto md:h-full' : 'aspect-[16/10]'}`}>
        {p.cover_image
          ? <img src={p.cover_image} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
          : <div className="w-full h-full grid place-items-center font-title text-gold/70 tracking-[0.4em]">MAXIMS</div>}
      </div>
      <div className={`p-5 sm:p-7 ${large ? 'md:p-10 flex flex-col justify-center' : ''}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 font-body text-[0.95rem] text-charcoal-muted">
          <span>{fmtDate(p.published_at)}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1"><Clock size={13} /> {p.reading_minutes || 1} min read</span>
        </div>
        <h2 className={`font-display font-semibold text-purple-rich dark:text-gold-light leading-tight group-hover:text-gold-deep transition-colors ${large ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{p.title}</h2>
        {p.excerpt && <p className="font-body text-[1rem] text-charcoal-muted leading-relaxed mt-3 line-clamp-3">{p.excerpt}</p>}
        {(p.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {p.tags.slice(0, 3).map((t) => <span key={t} className="font-title text-[0.76rem] font-bold tracking-[0.14em] uppercase text-gold-deep dark:text-gold border border-gold/40 px-2 py-1">{t}</span>)}
          </div>
        )}
        <span className="inline-flex items-center gap-2 mt-5 font-title text-[0.84rem] font-bold tracking-[0.16em] uppercase text-gold-deep dark:text-gold">Read the story <ArrowRight size={14} /></span>
      </div>
    </Link>
  )
}

export function BlogList() {
  const [params, setParams] = useSearchParams()
  const tag = params.get('tag') || ''
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/blog').then(setPosts).catch((e) => { setError(e.message); setPosts([]) })
  }, [])

  const tags = [...new Set((posts || []).flatMap((p) => p.tags || []))].slice(0, 12)
  const shown = (posts || []).filter((p) => !tag || (p.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase()))
  const [first, ...rest] = shown

  return (
    <div>
      <Meta title="Journal — Maxims Interiors" description="Design ideas, styling tips, and project stories from Maxims Interiors & Home Goods in Abuja." />
      <section className="page-hero min-h-[340px] sm:min-h-[400px]">
        <div className="page-hero-overlay" /><div className="page-hero-pattern" />
        <motion.div className="relative z-10 px-5 py-20 sm:py-24 text-center max-w-[760px]" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <p className="eyebrow mb-4">The Maxims Journal</p>
          <h1 className="text-display-lg text-cream-soft font-display mb-4">Ideas for <em className="text-gold-light italic">Beautiful Living</em></h1>
          <p className="font-body text-base sm:text-lg text-cream-soft/90">Design notes, styling tips and stories from our projects.</p>
        </motion.div>
      </section>

      <section className="section-base bg-cream-soft">
        <div className="max-w-[1200px] mx-auto">
          {tags.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-8 -mx-1 px-1" role="list" aria-label="Filter by topic">
              {['', ...tags].map((t) => (
                <button key={t || 'all'} onClick={() => setParams(t ? { tag: t } : {})}
                  className={`min-h-[44px] shrink-0 px-4 border font-title text-[0.8rem] font-bold tracking-[0.14em] uppercase transition-colors ${tag.toLowerCase() === t.toLowerCase() ? 'bg-purple-rich border-purple-rich text-gold-light' : 'border-purple-rich/25 text-purple-rich dark:text-gold-light hover:border-gold'}`}>
                  {t || 'All'}
                </button>
              ))}
            </div>
          )}
          {posts === null && <div className="grid md:grid-cols-3 gap-6">{[0, 1, 2].map((i) => <div key={i} className="aspect-[4/5] bg-cream-dark/60 animate-pulse" />)}</div>}
          {posts && shown.length === 0 && (
            <p className="text-center font-body text-lg text-charcoal-muted py-16">{error ? 'The journal could not be loaded. Please try again shortly.' : 'New stories are on the way. Check back soon.'}</p>
          )}
          {first && <div className="mb-8"><PostCard p={first} large /></div>}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((p) => <PostCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    setPost(null); setMissing(false)
    api.get(`/blog/${encodeURIComponent(slug)}`).then(setPost).catch(() => setMissing(true))
  }, [slug])

  if (missing) {
    return (
      <section className="min-h-[70vh] grid place-items-center bg-cream-soft px-5 pt-28 pb-16 text-center">
        <Meta title="Post not found — Maxims Interiors" noindex />
        <div>
          <h1 className="font-display text-4xl font-semibold text-purple-rich dark:text-gold-light mb-4">This story isn&apos;t here</h1>
          <Link to="/blog" className="btn-maxims btn-gold-solid">Back to the Journal</Link>
        </div>
      </section>
    )
  }
  if (!post) return <section className="min-h-[70vh] bg-cream-soft pt-32 px-5"><div className="max-w-[760px] mx-auto space-y-4"><div className="h-10 bg-cream-dark/60 animate-pulse" /><div className="h-72 bg-cream-dark/60 animate-pulse" /></div></section>

  const url = `${SITE}/blog/${post.slug}`
  const ld = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: post.seo_title || post.title, description: post.seo_description || post.excerpt || undefined,
    image: post.cover_image || undefined, datePublished: post.published_at, dateModified: post.updated_at,
    author: { '@type': 'Organization', name: post.author_name ? `${post.author_name}, Maxims Interiors` : 'Maxims Interiors' },
    publisher: { '@type': 'Organization', name: 'Maxims Interiors & Home Goods', '@id': `${SITE}/#business` },
    mainEntityOfPage: url, keywords: (post.tags || []).join(', ') || undefined,
  }

  return (
    <article>
      <Meta title={`${post.seo_title || post.title} — Maxims Interiors`} description={post.seo_description || post.excerpt} image={post.cover_image} noindex={post.preview} />
      <Helmet>
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        {post.published_at && <meta property="article:published_time" content={post.published_at} />}
        <script type="application/ld+json">{JSON.stringify(ld)}</script>
      </Helmet>

      <header className="bg-purple-darkest pt-28 sm:pt-32 pb-10 sm:pb-14 px-5">
        <div className="max-w-[820px] mx-auto">
          {post.preview && <p className="inline-block mb-4 bg-gold text-purple-darkest font-title text-[0.8rem] font-bold tracking-[0.16em] uppercase px-3 py-1">Preview — not published</p>}
          <Link to="/blog" className="inline-flex items-center gap-2 min-h-[44px] font-title text-[0.8rem] font-bold tracking-[0.16em] uppercase text-gold hover:text-gold-light"><ArrowLeft size={14} /> The Journal</Link>
          <h1 className="font-display text-[2.1rem] leading-[1.1] sm:text-5xl md:text-6xl font-semibold text-cream-soft mt-3 text-balance">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-5 font-body text-[0.95rem] text-cream-soft/85">
            {post.author_name && <span>By {post.author_name}</span>}
            {post.author_name && <span aria-hidden>·</span>}
            <time dateTime={post.published_at}>{fmtDate(post.published_at)}</time>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1"><Clock size={14} /> {post.reading_minutes || 1} min read</span>
          </div>
        </div>
      </header>

      {post.cover_image && (
        <div className="bg-purple-darkest px-0 sm:px-5">
          <div className="max-w-[1100px] mx-auto"><img src={post.cover_image} alt="" className="w-full max-h-[620px] object-cover" /></div>
        </div>
      )}

      <div className="bg-cream-soft px-5 py-12 sm:py-16">
        <div className="prose-maxims max-w-[720px] mx-auto" dangerouslySetInnerHTML={{ __html: post.content || '' }} />
        {(post.tags || []).length > 0 && (
          <div className="max-w-[720px] mx-auto mt-10 pt-6 border-t border-gold/30 flex flex-wrap gap-2">
            {post.tags.map((t) => <Link key={t} to={`/blog?tag=${encodeURIComponent(t)}`} className="min-h-[44px] inline-flex items-center font-title text-[0.8rem] font-bold tracking-[0.14em] uppercase text-gold-deep dark:text-gold border border-gold/40 px-3 hover:bg-gold/10">{t}</Link>)}
          </div>
        )}
        <div className="max-w-[720px] mx-auto mt-12 bg-purple-darkest p-6 sm:p-10 text-center">
          <p className="eyebrow mb-3">Love this look?</p>
          <h2 className="font-display text-3xl font-semibold text-cream-soft mb-5">Let&apos;s design your space</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/contact" className="btn-maxims btn-gold-solid justify-center">Book a Consultation</Link>
            <Link to="/shop" className="btn-maxims btn-outline-light justify-center">Shop Home Goods</Link>
          </div>
        </div>
      </div>

      {(post.newer || post.older || (post.related || []).length > 0) && (
        <section className="section-base bg-cream">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-display-md font-display text-purple-rich dark:text-gold-light text-center mb-10">Keep reading</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...(post.related || []), post.newer, post.older].filter(Boolean).filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i).slice(0, 3).map((p) => <PostCard key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}
    </article>
  )
}
