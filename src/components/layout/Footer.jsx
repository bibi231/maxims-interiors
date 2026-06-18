// src/components/layout/Footer.jsx
import { Link } from 'react-router-dom'
import { Instagram, Facebook, Linkedin, Youtube, MapPin, Phone, Mail } from 'lucide-react'
import { NAV_LINKS, CONTACT_FALLBACK, BRAND, TRUEWEB } from '@/data/site'
import { useSiteSettings } from '@/hooks/useData'
import NewsletterSignup from '@/components/NewsletterSignup'

export default function Footer() {
  const { settings } = useSiteSettings()
  const contact = settings.contact_info ?? CONTACT_FALLBACK
  const social = settings.social_links ?? {}
  const year = new Date().getFullYear()

  const socials = [
    { icon: Instagram, url: social.instagram, label: 'Instagram' },
    { icon: Facebook, url: social.facebook, label: 'Facebook' },
    { icon: Linkedin, url: social.linkedin, label: 'LinkedIn' },
    { icon: Youtube, url: social.youtube, label: 'YouTube' },
  ].filter((s) => s.url)

  return (
    <footer className="bg-purple-darkest border-t border-gold/15">
      <div className="container-lux px-5 sm:px-8 lg:px-16 py-16 lg:py-20">
        <div className="grid gap-12 lg:gap-8 lg:grid-cols-12">
          {/* Brand + newsletter */}
          <div className="lg:col-span-5">
            <Link to="/" className="flex items-center gap-3">
              <span className="grid place-items-center w-10 h-10 rounded-full border border-gold/50 text-gold font-display text-2xl leading-none">M</span>
              <span>
                <span className="block font-title text-cream-soft tracking-[0.28em]">MAXIMS</span>
                <span className="block font-body text-gold/60 text-[0.55rem] tracking-[0.2em] uppercase mt-0.5">Interiors &amp; Home Goods</span>
              </span>
            </Link>
            <p className="mt-5 font-editorial italic text-cream-soft/55 text-lg max-w-sm">“{BRAND.tagline}.”</p>
            <div className="mt-7 max-w-sm">
              <p className="eyebrow mb-3">Join the List</p>
              <p className="font-body text-cream-soft/50 text-sm mb-3">
                New collections, design notes, and private previews.
              </p>
              <NewsletterSignup variant="dark" source="footer" />
            </div>
          </div>

          {/* Explore */}
          <div className="lg:col-span-3">
            <p className="eyebrow mb-5">Explore</p>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="font-body text-sm text-cream-soft/55 hover:text-gold transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4">
            <p className="eyebrow mb-5">Visit &amp; Contact</p>
            <ul className="space-y-3.5 font-body text-sm text-cream-soft/55">
              <li className="flex gap-3"><MapPin size={16} className="text-gold/60 shrink-0 mt-0.5" /><span>{contact.address}</span></li>
              <li className="flex gap-3"><Phone size={16} className="text-gold/60 shrink-0 mt-0.5" /><a href={`tel:${(contact.phone || '').replace(/\s/g, '')}`} className="hover:text-gold transition-colors">{contact.phone}</a></li>
              <li className="flex gap-3"><Mail size={16} className="text-gold/60 shrink-0 mt-0.5" /><a href={`mailto:${contact.email}`} className="hover:text-gold transition-colors">{contact.email}</a></li>
            </ul>
            {contact.hours && <p className="mt-4 font-body text-xs text-cream-soft/35">{contact.hours}</p>}
            {socials.length > 0 && (
              <div className="mt-6 flex gap-3">
                {socials.map((s) => (
                  <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className="grid place-items-center w-9 h-9 border border-gold/25 text-gold/70 hover:text-gold hover:border-gold transition-colors">
                    <s.icon size={15} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="gold-divider mt-14 mb-7" />

        {/* Bottom bar + TrueWeb signature */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="font-body text-xs text-cream-soft/35">
            © {year} {BRAND.legalName}. All rights reserved.
          </p>
          <p className="font-body text-xs text-cream-soft/30">
            Crafted by{' '}
            <a
              href={TRUEWEB.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-title tracking-[0.15em] uppercase text-gold/70 hover:text-gold transition-colors"
            >
              {TRUEWEB.label}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
