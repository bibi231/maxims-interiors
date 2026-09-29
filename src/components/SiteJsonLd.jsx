// src/components/SiteJsonLd.jsx
// LocalBusiness structured data for search engines, built from the
// staff-editable contact details (Admin > Settings > Contact & Address).
import { Helmet } from 'react-helmet-async'
import { useContactInfo } from '@/hooks/useData'

const SITE = 'https://maximsinterior.com.ng'

export default function SiteJsonLd() {
  const { contact: ci, social } = useContactInfo()
  const data = {
    '@context': 'https://schema.org',
    '@type': ['InteriorDesigner', 'HomeGoodsStore'],
    '@id': `${SITE}/#business`,
    name: 'Maxims Interiors & Home Goods',
    slogan: 'Where Luxury Meets Living',
    url: SITE,
    logo: `${SITE}/favicon.svg`,
    email: ci.email || undefined,
    telephone: ci.phone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: ci.address,
      addressLocality: 'Abuja',
      addressRegion: 'FCT',
      addressCountry: 'NG',
    },
    areaServed: 'Nigeria',
    openingHours: undefined,
    sameAs: Object.values(social || {}).filter((u) => typeof u === 'string' && u.startsWith('http')),
  }
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  )
}
