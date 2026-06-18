// src/components/layout/Navbar.jsx
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { NAV_LINKS, BRAND } from '@/data/site'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-luxe',
          scrolled
            ? 'bg-purple-darkest/92 backdrop-blur-md border-b border-gold/15 py-3'
            : 'bg-transparent py-5',
        )}
      >
        <div className="container-lux px-5 sm:px-8 lg:px-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <span className="grid place-items-center w-9 h-9 rounded-full border border-gold/50 text-gold font-display text-xl leading-none group-hover:border-gold transition-colors">
              M
            </span>
            <span className="leading-none">
              <span className="block font-title text-cream-soft tracking-[0.28em] text-sm">MAXIMS</span>
              <span className="block font-body text-gold/60 text-[0.5rem] tracking-[0.22em] uppercase mt-0.5">
                Interiors &amp; Home Goods
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden xl:flex items-center gap-7">
            {NAV_LINKS.map((l) => {
              const active = location.pathname === l.path
              return (
                <Link
                  key={l.path}
                  to={l.path}
                  className={cn(
                    'font-title text-[0.7rem] tracking-[0.18em] uppercase transition-colors relative py-1',
                    active ? 'text-gold' : 'text-cream-soft/70 hover:text-gold',
                  )}
                >
                  {l.label}
                  {active && (
                    <motion.span layoutId="nav-underline" className="absolute -bottom-0.5 left-0 right-0 h-px bg-gold" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="hidden xl:flex items-center gap-3 shrink-0">
            {user && (
              <Link to="/admin" className="font-title text-[0.62rem] tracking-[0.18em] uppercase text-gold/70 hover:text-gold transition-colors">
                Admin
              </Link>
            )}
            <Link to="/contact" className="btn-gold-solid">Book Consultation</Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="xl:hidden text-cream-soft hover:text-gold transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 xl:hidden bg-purple-darkest/98 backdrop-blur-lg flex flex-col items-center justify-center gap-1 px-8"
          >
            {NAV_LINKS.map((l, i) => (
              <motion.div
                key={l.path}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Link
                  to={l.path}
                  className={cn(
                    'block py-3 font-display text-2xl text-center transition-colors',
                    location.pathname === l.path ? 'text-gold' : 'text-cream-soft/80 hover:text-gold',
                  )}
                >
                  {l.label}
                </Link>
              </motion.div>
            ))}
            <Link to="/contact" className="btn-gold-solid mt-6">Book Consultation</Link>
            {user && <Link to="/admin" className="font-title text-xs tracking-widest uppercase text-gold/70 mt-4">Admin Dashboard</Link>}
            <p className="absolute bottom-8 text-center text-cream-soft/30 font-body text-xs">
              {BRAND.tagline}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
