// src/components/NewsletterSignup.jsx
import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { subscribeNewsletter } from '@/hooks/useData'
import { cn } from '@/lib/utils'

/**
 * Newsletter capture. Stores the subscriber via the API; the server
 * sends the welcome email after the insert.
 */
export default function NewsletterSignup({ variant = 'dark', source = 'footer' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [msg, setMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus('error'); setMsg('Please enter a valid email address.'); return
    }
    setStatus('loading')
    try {
      await subscribeNewsletter(value, source)
      setStatus('done'); setMsg('You are on the list. Welcome to Maxims.'); setEmail('')
    } catch (err) {
      // Unique-violation = already subscribed; treat as success
      if (String(err?.message || '').toLowerCase().includes('duplicate')) {
        setStatus('done'); setMsg('You are already subscribed — thank you.')
      } else {
        setStatus('error'); setMsg('Something went wrong. Please try again.')
      }
    }
  }

  const light = variant === 'light'

  if (status === 'done') {
    return (
      <div className={cn('flex items-center gap-2 font-body text-sm', light ? 'text-purple-rich' : 'text-gold')}>
        <Check size={16} /> {msg}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-stretch border-b border-gold/30 focus-within:border-gold transition-colors">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
          placeholder="Your email address"
          aria-label="Email address"
          className={cn(
            'flex-1 bg-transparent py-2.5 font-body text-sm outline-none placeholder:text-cream-soft/30',
            light ? 'text-charcoal placeholder:text-charcoal/40' : 'text-cream-soft',
          )}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-3 text-gold hover:text-gold-bright transition-colors disabled:opacity-50"
          aria-label="Subscribe"
        >
          {status === 'loading'
            ? <span className="font-title text-[0.6rem] tracking-widest uppercase">…</span>
            : <ArrowRight size={18} />}
        </button>
      </div>
      {status === 'error' && <p className="mt-2 font-body text-xs text-red-400">{msg}</p>}
    </form>
  )
}
