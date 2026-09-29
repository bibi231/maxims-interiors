// src/components/RequestModal.jsx
// Order / quote request form. Used by the cart, product pages and service
// pages. Submits to POST /api/orders (no payment). Shows a reference number.
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Send, CreditCard, Phone, Mail, MessageCircle } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { placeOrder, usePricing } from '@/hooks/useData'
import { payForOrder } from '@/hooks/usePayment'
import { formatNaira, cn } from '@/lib/utils'

const CONTACT_OPTIONS = [
  { value: 'phone', label: 'Phone call', Icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  { value: 'email', label: 'Email', Icon: Mail },
]

const EMPTY = { customer_name: '', customer_phone: '', customer_email: '', delivery_address: '', city: '', notes: '', preferred_contact: 'phone', service: '' }

const inputCls = 'w-full bg-card border border-purple-rich/15 dark:border-gold/20 px-3.5 py-3 font-body text-[0.9rem] text-charcoal dark:text-cream-soft placeholder:text-charcoal-muted/60 focus:outline-none focus:border-gold transition-colors'
const labelCls = 'font-title text-[0.56rem] tracking-[0.18em] uppercase text-charcoal-muted block mb-1.5'

export default function RequestModal() {
  const { request, closeRequest, items: cartItems, subtotal: cartSubtotal, clear, paymentsEnabled } = useCart()
  const { pricing } = usePricing()
  const [form, setForm] = useState(EMPTY)
  const [state, setState] = useState('idle') // idle | sending | done | error
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (!request) return
    setState('idle'); setError(''); setResult(null)
    setForm((f) => ({ ...EMPTY, ...pickContact(f), service: request.service || '' }))
  }, [request])

  if (!request) return null
  const isQuote = request.kind === 'quote'
  const pkg = request.package ? (pricing.packages || []).find((p) => p.name === request.package) : null
  const lineItems = request.product ? [{ ...request.product, qty: request.qty || 1 }]
    : request.source === 'cart' ? cartItems
    : pkg?.price ? [{ id: `pkg-${pkg.name}`, name: `${pkg.name} design package`, price: pkg.price, qty: 1, isPackage: true }] : []
  const total = lineItems.reduce((s, i) => s + Number(i.price || 0) * i.qty, 0)
  const title = isQuote ? (request.service ? 'Request a quote' : 'Request a quote') : 'Request your order'
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.customer_name.trim()) return setError('Please enter your full name.')
    if (form.customer_phone.replace(/\D/g, '').length < 7) return setError('Please enter a phone number we can reach you on.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email.trim())) return setError('Please enter a valid email address.')
    if (!isQuote && !form.delivery_address.trim()) return setError('Please enter a delivery address.')
    setState('sending')
    try {
      const res = await placeOrder({
        kind: request.kind,
        source: request.source,
        ...form,
        service: form.service || undefined,
        items: lineItems.filter((i) => !i.isPackage).map((i) => ({ product_id: i.id, qty: i.qty })),
        package: request.package || undefined,
      })
      try { localStorage.setItem('maxims_contact', JSON.stringify(pickContact(form))) } catch { /* ignore */ }
      if (request.source === 'cart') clear()
      setResult(res)
      setState('done')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again or call us.')
      setState('error')
    }
  }

  async function payNow() {
    if (!result) return
    setPaying(true)
    try {
      await payForOrder({ orderId: result.id, token: result.pay_token })
    } catch (err) {
      setError(err.message || 'Payment could not be started. Our team will contact you instead.')
      setPaying(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[400] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeRequest}>
        <motion.div role="dialog" aria-modal="true" aria-label={title}
          className="w-full sm:max-w-[560px] bg-cream-soft dark:bg-charcoal max-h-[92vh] overflow-y-auto border-t-2 sm:border-2 border-gold/60"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()}>

          <div className="sticky top-0 bg-cream-soft dark:bg-charcoal flex items-start justify-between px-5 sm:px-7 pt-5 pb-3 border-b border-gold/15 z-10">
            <div>
              <p className="eyebrow text-[0.55rem] mb-1">{isQuote ? 'No obligation' : 'No payment needed now'}</p>
              <h2 className="font-display text-2xl text-purple-rich dark:text-gold-light">{state === 'done' ? 'Request received' : title}</h2>
            </div>
            <button onClick={closeRequest} aria-label="Close" className="p-2 -mr-2 text-charcoal-muted hover:text-gold"><X size={20} /></button>
          </div>

          {state === 'done' && result ? (
            <div className="px-5 sm:px-7 py-6 text-center">
              <CheckCircle2 size={44} className="text-gold mx-auto mb-3" />
              <p className="font-body text-[0.92rem] text-charcoal dark:text-cream-soft mb-4">
                Thank you, {form.customer_name.split(' ')[0]}. We have received your {isQuote ? 'quote request' : 'order request'} and will contact you by {CONTACT_OPTIONS.find((c) => c.value === form.preferred_contact)?.label.toLowerCase()} shortly.
              </p>
              <div className="inline-block bg-card border-l-2 border-gold px-5 py-3 mb-4 text-left">
                <div className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-charcoal-muted">Your reference</div>
                <div className="font-display text-2xl text-purple-rich dark:text-gold-light tracking-wide">{result.order_number}</div>
              </div>
              <p className="font-body text-[0.78rem] text-charcoal-muted mb-6">A confirmation has been sent to {form.customer_email}. Please keep your reference number.</p>
              {error && <p className="font-body text-[0.8rem] text-red-600 mb-3">{error}</p>}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {paymentsEnabled && result.payable && (
                  <button onClick={payNow} disabled={paying} className="btn-maxims btn-gold-solid justify-center disabled:opacity-50">
                    <CreditCard size={14} /> {paying ? 'Opening payment...' : `Pay ${formatNaira(result.total)} now`}
                  </button>
                )}
                <button onClick={closeRequest} className={cn('btn-maxims justify-center', paymentsEnabled && result.payable ? 'btn-outline-gold' : 'btn-gold-solid')}>Done</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="px-5 sm:px-7 py-5 space-y-4" noValidate>
              {lineItems.length > 0 && (
                <div className="bg-card border border-gold/15 divide-y divide-gold/10">
                  {lineItems.map((i) => (
                    <div key={i.id} className="flex justify-between gap-3 px-4 py-2.5 font-body text-[0.84rem]">
                      <span className="text-charcoal dark:text-cream-soft truncate">{i.name} <span className="text-charcoal-muted">x {i.qty}</span></span>
                      <span className="text-charcoal-muted whitespace-nowrap">{formatNaira(Number(i.price) * i.qty)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2.5 font-body text-[0.86rem]">
                    <span className="font-semibold text-purple-rich dark:text-gold-light">Estimated total</span>
                    <span className="font-semibold text-purple-rich dark:text-gold-light">{formatNaira(request.source === 'cart' ? cartSubtotal : total)}</span>
                  </div>
                </div>
              )}

              {request.service !== undefined && (
                <div>
                  <label className={labelCls} htmlFor="rq-service">Service</label>
                  <input id="rq-service" className={inputCls} value={form.service} onChange={set('service')} placeholder="e.g. Full room design" />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="rq-name">Full name *</label>
                  <input id="rq-name" autoComplete="name" className={inputCls} value={form.customer_name} onChange={set('customer_name')} required />
                </div>
                <div>
                  <label className={labelCls} htmlFor="rq-phone">Phone *</label>
                  <input id="rq-phone" type="tel" inputMode="tel" autoComplete="tel" className={inputCls} value={form.customer_phone} onChange={set('customer_phone')} placeholder="080..." required />
                </div>
                <div>
                  <label className={labelCls} htmlFor="rq-email">Email *</label>
                  <input id="rq-email" type="email" autoComplete="email" className={inputCls} value={form.customer_email} onChange={set('customer_email')} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="rq-addr">{isQuote ? 'Address / project location' : 'Delivery address *'}</label>
                  <input id="rq-addr" autoComplete="street-address" className={inputCls} value={form.delivery_address} onChange={set('delivery_address')} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="rq-city">City</label>
                  <input id="rq-city" autoComplete="address-level2" className={inputCls} value={form.city} onChange={set('city')} placeholder="Abuja" />
                </div>
              </div>

              <div>
                <span className={labelCls}>How should we contact you?</span>
                <div className="grid grid-cols-3 gap-2">
                  {CONTACT_OPTIONS.map(({ value, label, Icon }) => (
                    <button type="button" key={value} onClick={() => setForm((f) => ({ ...f, preferred_contact: value }))}
                      aria-pressed={form.preferred_contact === value}
                      className={cn('flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 border font-body text-[0.75rem] transition-colors',
                        form.preferred_contact === value ? 'border-gold bg-gold/10 text-purple-rich dark:text-gold-light' : 'border-purple-rich/15 dark:border-gold/20 text-charcoal-muted hover:border-gold/60')}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls} htmlFor="rq-notes">{isQuote ? 'Tell us about your needs' : 'Notes (optional)'}</label>
                <textarea id="rq-notes" rows={3} className={inputCls} value={form.notes} onChange={set('notes')}
                  placeholder={isQuote ? 'Rooms, sizes, style, budget, timeline...' : 'Colour, delivery timing, anything we should know'} />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 px-3.5 py-2.5">
                  <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
                  <span className="font-body text-[0.82rem] text-red-700 dark:text-red-400">{error}</span>
                </div>
              )}

              <button type="submit" disabled={state === 'sending'} className="btn-maxims btn-gold-solid w-full justify-center disabled:opacity-50">
                <Send size={14} /> {state === 'sending' ? 'Sending...' : isQuote ? 'Send quote request' : 'Send order request'}
              </button>
              <p className="font-body text-[0.7rem] text-charcoal-muted text-center">
                No payment is taken now. Our team will confirm {isQuote ? 'your quote' : 'availability, delivery and payment'} with you directly.
              </p>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function pickContact(f) {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem('maxims_contact') || '{}') } catch { /* ignore */ }
  const src = f?.customer_name ? f : saved
  return {
    customer_name: src.customer_name || '', customer_phone: src.customer_phone || '', customer_email: src.customer_email || '',
    delivery_address: src.delivery_address || '', city: src.city || '', preferred_contact: src.preferred_contact || 'phone',
  }
}
