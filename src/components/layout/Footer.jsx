import { Link } from 'react-router-dom'
import { Instagram, Facebook, Linkedin, Youtube, MapPin, Phone, Mail, Clock } from 'lucide-react'

const NAV_LINKS = ['/', '/about', '/interior-decor', '/shop', '/gallery', '/team', '/testimonials']
const NAV_NAMES = ['Home', 'About Us', 'Interior Décor', 'Shop', 'Gallery', 'Our Team', 'Reviews']

const SERVICES = ['Full Room Design', 'Space Planning', 'Color Consultation', 'Furniture Sourcing', 'Bulk & Trade Orders', 'Virtual Design', 'Home Staging']

const CONTACT = [
    { icon: MapPin, text: '123 Design Boulevard, Wuse 2, Abuja, FCT, Nigeria' },
    { icon: Phone, text: '+234 800 000 0000' },
    { icon: Mail, text: 'hello@maximsinteriors.com' },
    { icon: Clock, text: 'Mon–Sat: 9am – 7pm WAT' },
]

export default function Footer() {
    return (
        <footer className="bg-charcoal relative">
            {/* Gold top line */}
            <div className="h-px w-full" style={{ background: 'linear-gradient(to right, transparent, #C9A84C, transparent)' }} />

            <div className="max-w-screen-xl mx-auto px-8 md:px-16 pt-20 pb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

                {/* Brand */}
                <div className="lg:col-span-1">
                    <Link to="/" className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-full border border-gold/40 flex items-center justify-center shrink-0">
                            <span className="font-title text-xl font-bold text-gold">M</span>
                        </div>
                        <div>
                            <div className="font-title text-sm font-bold tracking-[0.3em] text-gold leading-none">MAXIMS</div>
                            <div className="font-body text-[0.46rem] tracking-[0.2em] uppercase text-gold/40 mt-1">Interiors & Home Goods</div>
                        </div>
                    </Link>
                    <p className="font-body text-[0.82rem] text-cream-soft/35 leading-relaxed mb-6">
                        Where luxury meets living. Transforming spaces into timeless experiences through refined design, curated home goods, and uncompromising craftsmanship.
                    </p>
                    <div className="flex gap-2">
                        {[Instagram, Facebook, Linkedin, Youtube].map((Icon, i) => (
                            <a key={i} href="#"
                                className="w-9 h-9 border border-gold/20 flex items-center justify-center text-gold/50 hover:text-gold hover:border-gold hover:bg-gold/8 transition-all duration-300 -translate-y-0 hover:-translate-y-0.5">
                                <Icon size={14} />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Navigate */}
                <div>
                    <h4 className="font-title text-[0.62rem] tracking-[0.3em] uppercase text-gold pb-4 mb-5 border-b border-gold/12">Navigate</h4>
                    <ul className="space-y-2.5">
                        {NAV_LINKS.map((path, i) => (
                            <li key={path}>
                                <Link to={path} className="font-body text-[0.8rem] text-cream-soft/38 hover:text-gold hover:pl-1 transition-all duration-200 block">
                                    {NAV_NAMES[i]}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Services */}
                <div>
                    <h4 className="font-title text-[0.62rem] tracking-[0.3em] uppercase text-gold pb-4 mb-5 border-b border-gold/12">Services</h4>
                    <ul className="space-y-2.5">
                        {SERVICES.map((s) => (
                            <li key={s}>
                                <Link to="/interior-decor" className="font-body text-[0.8rem] text-cream-soft/38 hover:text-gold hover:pl-1 transition-all duration-200 block">
                                    {s}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Contact */}
                <div>
                    <h4 className="font-title text-[0.62rem] tracking-[0.3em] uppercase text-gold pb-4 mb-5 border-b border-gold/12">Contact</h4>
                    <div className="space-y-4">
                        {CONTACT.map(({ icon: Icon, text }) => (
                            <div key={text} className="flex gap-3 items-start">
                                <Icon size={13} className="text-gold mt-0.5 shrink-0" />
                                <span className="font-body text-[0.79rem] text-cream-soft/38 leading-relaxed">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-gold/8 mx-8 md:mx-16">
                <div className="max-w-screen-xl mx-auto py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="font-body text-[0.7rem] text-cream-soft/22 tracking-wide">
                        © {new Date().getFullYear()} Maxims Interiors & Home Goods. All Rights Reserved.
                    </p>
                    <div className="flex items-center gap-4 text-[0.7rem] text-cream-soft/22">
                        <a href="#" className="hover:text-gold transition-colors">Privacy</a>
                        <span>·</span>
                        <a href="#" className="hover:text-gold transition-colors">Terms</a>
                        <span>·</span>
                        <Link to="/admin" className="hover:text-gold transition-colors">Admin</Link>
                    </div>
                </div>
            </div>

            {/* Bottom gold bar */}
            <div className="h-[3px]" style={{ background: 'linear-gradient(to right, #2E1660, #C9A84C, #2E1660)' }} />
        </footer>
    )
}
