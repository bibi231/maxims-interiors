// src/pages/NotFound.jsx
import { Link } from 'react-router-dom'
import Meta from '@/components/Meta'

export default function NotFound() {
  return (
    <>
      <Meta title="Page Not Found — Maxims Interiors" noindex />
      <section className="min-h-[70vh] grid place-items-center bg-charcoal bg-lux-radial px-5 pt-28 pb-16 text-center">
        <div>
          <div className="font-display text-7xl sm:text-9xl text-gold/30">404</div>
          <h1 className="text-display-md mt-2">This page has moved house</h1>
          <p className="mt-4 font-body text-cream-soft/55 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been relocated. Let's get you back to something beautiful.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Link to="/" className="btn-gold-solid">Back to Home</Link>
            <Link to="/gallery" className="btn-outline-light">View Gallery</Link>
          </div>
        </div>
      </section>
    </>
  )
}
