import { Link } from 'react-router-dom'
import { Instagram, Facebook, Linkedin, Youtube, MapPin, Phone, Mail, Clock } from 'lucide-react'
import NewsletterSignup from '@/components/NewsletterSignup'
import { useContactInfo, usePricing } from '@/hooks/useData'
import { mapsUrl, telHref } from '@/lib/siteDefaults'

const NAV = [
    ['/', 'Home'], ['/about', 'About Us'], ['/interior-decor', 'Interior Décor'], ['/shop', 'Shop'],
    ['/gallery', 'Gallery'], ['/blog', 'Journal'], ['/team', 'Our Team'], ['/testimonials', 'Reviews'],
]

export default function Footer() {
    const { contact: ci, social } = useContactInfo()
    const { pricing } = usePricing()
    const services = [...(pricing.services || []).map((s) => s.title), 'Bulk & Trade Orders'].slice(0, 8)
    const CONTACT = [
        { icon: MapPin, text: ci.address, href: mapsUrl(ci), external: true },
        { icon: Phone, text: ci.phone, href: telHref(ci.phone) },
        { icon: Mail, text: ci.email, href: ci.email ? `mailto:${ci.email}` : null },
        { icon: Clock, text: ci.hours },
    ].filter(c => c.text)
    const SOCIAL = [[Instagram, social.instagram, 'Instagram'], [Facebook, social.facebook, 'Facebook'], [Linkedin, social.linkedin, 'LinkedIn'], [Youtube, social.youtube, 'YouTube']].filter(([, url]) => url)
    const linkCls = 'font-body text-[0.95rem] text-cream-soft/90 hover:text-gold transition-colors duration-200 inline-flex items-center min-h-[40px]'

    return (
        <footer className="bg-charcoal relative">
            <div className="h-px w-full" style={{ background: 'linear-gradient(to right, transparent, #C9A84C, transparent)' }} />

            <div className="max-w-screen-xl mx-auto px-5 sm:px-8 md:px-16 pt-16 md:pt-20 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

                {/* Brand */}
                <div>
                    <Link to="/" className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-full border border-gold/50 flex items-center justify-center shrink-0">
                            <span className="font-title text-xl font-bold text-gold">M</span>
                        </div>
                        <div>
                            <div className="font-title text-base font-bold tracking-[0.3em] text-gold leading-none">MAXIMS</div>
                            <div className="font-body text-[0.68rem] font-bold tracking-[0.18em] uppercase text-gold/80 mt-1">Interiors & Home Goods</div>
                        </div>
                    </Link>
                    <p className="font-body text-[0.95rem] text-cream-soft/90 leading-relaxed mb-6">
                        Where luxury meets living. Transforming spaces into timeless experiences through refined design, curated home goods, and uncompromising craftsmanship.
                    </p>
                    {SOCIAL.length > 0 && (
                        <div className="flex gap-2">
                            {SOCIAL.map(([Icon, url, label]) => (
                                <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}
                                    className="w-11 h-11 border border-gold/35 flex items-center justify-center text-gold/80 hover:text-gold hover:border-gold transition-all duration-300">
                                    <Icon size={17} />
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* Navigate */}
                <div>
                    <h4 className="font-title text-[0.78rem] font-bold tracking-[0.25em] uppercase text-gold pb-3 mb-3 border-b border-gold/20">Navigate</h4>
                    <ul className="grid grid-cols-2 sm:grid-cols-1 gap-x-4">
                        {NAV.map(([path, name]) => (
                            <li key={path}><Link to={path} className={linkCls}>{name}</Link></li>
                        ))}
                    </ul>
                </div>

                {/* Services */}
                <div>
                    <h4 className="font-title text-[0.78rem] font-bold tracking-[0.25em] uppercase text-gold pb-3 mb-3 border-b border-gold/20">Services</h4>
                    <ul>
                        {services.map((s) => (
                            <li key={s}>
                                <Link to={s.startsWith('Bulk') ? '/bulk-orders' : '/interior-decor'} className={linkCls}>{s}</Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Contact */}
                <div>
                    <h4 className="font-title text-[0.78rem] font-bold tracking-[0.25em] uppercase text-gold pb-3 mb-4 border-b border-gold/20">Visit & Contact</h4>
                    <address className="not-italic space-y-3 mb-6">
                        {CONTACT.map(({ icon: Icon, text, href, external }) => {
                            const body = (<><Icon size={16} className="text-gold mt-1 shrink-0" /><span className="font-body text-[0.95rem] text-cream-soft/90 leading-relaxed break-words">{text}</span></>)
                            return href
                                ? <a key={text} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="flex gap-3 items-start hover:text-gold min-h-[40px]">{body}</a>
                                : <div key={text} className="flex gap-3 items-start">{body}</div>
                        })}
                    </address>
                    <h4 className="font-title text-[0.72rem] font-bold tracking-[0.22em] uppercase text-gold mb-3">Stay Inspired</h4>
                    <NewsletterSignup variant="dark" source="footer" />
                </div>
            </div>

            <div className="border-t border-gold/15 mx-5 sm:mx-8 md:mx-16">
                <div className="max-w-screen-xl mx-auto py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="font-body text-[0.85rem] text-cream-soft/80 tracking-wide text-center sm:text-left">
                        © {new Date().getFullYear()} Maxims Interiors & Home Goods. All Rights Reserved.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 text-[0.85rem] text-cream-soft/80">
                        <a href="mailto:support@maximsinterior.com.ng" className="hover:text-gold transition-colors inline-flex items-center min-h-[44px]">Support</a>
                        <span aria-hidden>·</span>
                        <Link to="/contact" className="hover:text-gold transition-colors inline-flex items-center min-h-[44px]">Contact</Link>
                        <span aria-hidden>·</span>
                        <Link to="/admin" className="hover:text-gold transition-colors inline-flex items-center min-h-[44px]">Staff</Link>
                    </div>
                </div>
                <div className="max-w-screen-xl mx-auto pb-5 text-center">
                    <a href="https://trueweb.com.ng" target="_blank" rel="noopener noreferrer"
                        className="font-body text-[0.78rem] tracking-wide text-cream-soft/60 hover:text-gold transition-colors">
                        Crafted by TrueWeb Network
                    </a>
                </div>
            </div>

            <div className="h-[3px]" style={{ background: 'linear-gradient(to right, #2E1660, #C9A84C, #2E1660)' }} />
        </footer>
    )
}
