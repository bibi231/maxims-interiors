import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Nav link data ───────────────────────────────────────── */
const NAV = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    {
        label: 'Services',
        children: [
            { label: 'Interior Décor & Design', path: '/interior-decor', desc: 'Full-service room design & staging' },
            { label: 'Bulk & Trade Orders', path: '/bulk-orders', desc: 'Volume pricing for hotels & developers' },
        ],
    },
    { label: 'Shop', path: '/shop' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'Our Team', path: '/team' },
    { label: 'Reviews', path: '/testimonials' },
]

/* ── Mega-drop ───────────────────────────────────────────── */
function MegaDrop({ items }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2
                 min-w-[280px] z-50
                 bg-charcoal border border-gold/20
                 shadow-[0_20px_60px_rgba(18,17,26,0.6)]
                 backdrop-blur-xl"
        >
            <div className="p-2">
                {items.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className="group flex flex-col gap-0.5 px-4 py-3
                       hover:bg-gold/8 transition-colors duration-200"
                    >
                        <span className="font-title text-[0.7rem] tracking-[0.15em] uppercase text-cream-soft group-hover:text-gold transition-colors">
                            {item.label}
                        </span>
                        <span className="font-body text-[0.72rem] text-cream-soft group-hover:text-cream-soft transition-colors">
                            {item.desc}
                        </span>
                    </Link>
                ))}
            </div>
            <div className="border-t border-gold/10 p-3">
                <Link
                    to="/contact"
                    className="flex items-center gap-2 px-4 py-2 text-[0.62rem] font-title tracking-[0.2em] uppercase text-gold hover:text-gold-light transition-colors"
                >
                    Book a Consultation <ArrowRight size={12} />
                </Link>
            </div>
        </motion.div>
    )
}

/* ── Main Navbar ─────────────────────────────────────────── */
export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [activeDropdown, setDrop] = useState(null)
    const location = useLocation()
    const isHome = location.pathname === '/'
    const isAdmin = location.pathname === '/admin'

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 55)
        window.addEventListener('scroll', handler, { passive: true })
        return () => window.removeEventListener('scroll', handler)
    }, [])

    useEffect(() => { setMobileOpen(false); setDrop(null) }, [location])

    if (isAdmin) return null

    const transparent = isHome && !scrolled

    return (
        <>
            <nav
                className={cn(
                    'fixed top-0 inset-x-0 z-[100] flex items-center justify-between transition-all duration-400',
                    transparent
                        ? 'bg-transparent py-5 px-8 md:px-12'
                        : 'py-3 px-8 md:px-12 bg-charcoal/95 backdrop-blur-xl shadow-[0_1px_0_rgba(201,168,76,0.12)]',
                )}
            >
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 shrink-0">
                    <div className={cn(
                        'w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300',
                        transparent ? 'border-gold/60' : 'border-gold/40',
                    )}>
                        <span className="font-title text-lg font-bold text-gold leading-none">M</span>
                    </div>
                    <div className="hidden sm:flex flex-col gap-px">
                        <span className="font-title text-[0.82rem] font-bold tracking-[0.28em] text-gold leading-none">MAXIMS</span>
                        <span className="font-body text-[0.46rem] tracking-[0.22em] uppercase text-gold/45 leading-none">Interiors & Home Goods</span>
                    </div>
                </Link>

                {/* Desktop Links */}
                <ul className="hidden lg:flex items-center gap-1">
                    {NAV.map((item) =>
                        item.children ? (
                            <li
                                key={item.label}
                                className="relative"
                                onMouseEnter={() => setDrop(item.label)}
                                onMouseLeave={() => setDrop(null)}
                            >
                                <button className={cn(
                                    'flex items-center gap-1.5 px-3 py-2',
                                    'font-body text-[0.7rem] font-bold tracking-[0.12em] uppercase transition-colors duration-200',
                                    transparent ? 'text-cream-soft hover:text-gold' : 'text-cream-soft hover:text-gold',
                                )}>
                                    {item.label}
                                    <ChevronDown size={11} className={cn('transition-transform duration-200', activeDropdown === item.label && 'rotate-180')} />
                                </button>
                                <AnimatePresence>
                                    {activeDropdown === item.label && <MegaDrop items={item.children} />}
                                </AnimatePresence>
                            </li>
                        ) : (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={cn(
                                        'relative px-3 py-2 font-body text-[0.7rem] font-bold tracking-[0.12em] uppercase transition-colors duration-200 block',
                                        'after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-px after:bg-gold',
                                        'after:transition-all after:duration-300',
                                        location.pathname === item.path
                                            ? 'text-gold after:w-[80%]'
                                            : transparent
                                                ? 'text-cream-soft hover:text-gold after:w-0 hover:after:w-[80%]'
                                                : 'text-cream-soft hover:text-gold after:w-0 hover:after:w-[80%]',
                                    )}
                                >
                                    {item.label}
                                </Link>
                            </li>
                        )
                    )}
                </ul>

                {/* CTA + Hamburger */}
                <div className="flex items-center gap-3">
                    <Link
                        to="/contact"
                        className="hidden lg:inline-flex btn-maxims btn-gold-solid text-[0.62rem] px-5 py-2.5"
                    >
                        Book Consultation
                    </Link>
                    <button
                        className="lg:hidden text-gold p-1"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-charcoal/70 backdrop-blur-sm z-[98] lg:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="fixed top-0 right-0 bottom-0 w-[300px] z-[99] bg-charcoal-mid
                         flex flex-col overflow-y-auto lg:hidden
                         border-l border-gold/10"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gold/10">
                                <div>
                                    <div className="font-title text-sm tracking-[0.3em] text-gold font-bold">MAXIMS</div>
                                    <div className="font-body text-[0.5rem] tracking-[0.2em] uppercase text-gold/40 mt-0.5">Interiors & Home Goods</div>
                                </div>
                                <button onClick={() => setMobileOpen(false)} className="text-gold/60 hover:text-gold">
                                    <X size={20} />
                                </button>
                            </div>

                            <nav className="flex-1 p-4">
                                {NAV.map((item) =>
                                    item.children ? (
                                        <div key={item.label} className="mb-1">
                                            <span className="block px-4 py-1.5 font-body text-[0.58rem] tracking-[0.3em] uppercase text-gold/40">
                                                {item.label}
                                            </span>
                                            {item.children.map((c) => (
                                                <Link
                                                    key={c.path} to={c.path}
                                                    className="block px-4 py-2.5 font-title text-[0.8rem] tracking-[0.08em] text-cream-soft hover:text-gold hover:pl-6 transition-all duration-200 border-b border-gold/5"
                                                >
                                                    {c.label}
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <Link
                                            key={item.path} to={item.path}
                                            className={cn(
                                                'block px-4 py-3 font-title text-[0.95rem] tracking-[0.08em] transition-all duration-200 border-b border-gold/5',
                                                location.pathname === item.path ? 'text-gold' : 'text-cream-soft hover:text-gold hover:pl-6',
                                            )}
                                        >
                                            {item.label}
                                        </Link>
                                    )
                                )}
                            </nav>

                            <div className="p-6 border-t border-gold/10">
                                <Link to="/contact" className="btn-maxims btn-gold-solid w-full justify-center text-[0.62rem]">
                                    Book Consultation
                                </Link>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
