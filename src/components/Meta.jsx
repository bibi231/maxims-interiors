// src/components/Meta.jsx
import { Helmet } from 'react-helmet-async'

const DEFAULT_TITLE = 'Maxims Interiors & Home Goods — Where Luxury Meets Living'
const DEFAULT_DESC =
  'Premium interior design, luxury home goods, and bulk/trade supply in Abuja, Nigeria. Where Luxury Meets Living.'

/**
 * Per-page SEO. Usage: <Meta title="Shop — Maxims" description="…" />
 */
export default function Meta({ title, description, image, noindex = false }) {
  const fullTitle = title ? `${title}` : DEFAULT_TITLE
  const desc = description ?? DEFAULT_DESC
  const url = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  )
}
