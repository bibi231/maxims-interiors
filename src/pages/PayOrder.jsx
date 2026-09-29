// src/pages/PayOrder.jsx
// Customer pay page: /pay/:id?t=<token>. Shows the order/quote summary with
// the server-side total and starts a Squad checkout. No amount comes from here.
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CreditCard, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react'
import Meta from '@/components/Meta'
import { api } from '@/lib/api'
import { payForOrder } from '@/hooks/usePayment'
import { formatNaira } from '@/lib/utils'

export default function PayOrder() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const token = params.get('t') || ''
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    api.get(`/orders/pay/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`)
      .then(setOrder).catch((e) => setError(e.message || 'This payment link is not valid.'))
  }, [id, token])

  async function pay() {
    setPaying(true); setError('')
    try { await payForOrder({ orderId: id, token }) } catch (e) { setError(e.message); setPaying(false) }
  }

  return (
    <>
      <Meta title="Pay — Maxims Interiors" noindex />
      <section className="min-h-screen bg-cream-soft px-4 sm:px-6 pt-28 pb-16">
        <div className="max-w-[560px] mx-auto bg-card border border-gold/30 p-5 sm:p-8">
          {!order && !error && <div className="flex items-center gap-3 font-body text-charcoal"><Loader2 className="animate-spin text-gold" /> Loading your payment...</div>}
          {error && !order && (
            <div className="text-center">
              <AlertCircle size={40} className="text-red-600 mx-auto mb-3" />
              <p className="font-body text-base text-charcoal mb-5">{error}</p>
              <Link to="/contact" className="btn-maxims btn-gold-solid justify-center">Contact us</Link>
            </div>
          )}
          {order && (
            <>
              <p className="eyebrow mb-2">{order.kind === 'quote' ? 'Quote' : 'Order'} {order.order_number}</p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-purple-rich dark:text-gold-light mb-5">
                {order.payment_status === 'paid' ? 'Payment received' : `Hello ${order.customer_name}, here is your payment`}
              </h1>
              {order.items?.length > 0 && (
                <div className="border border-gold/20 divide-y divide-gold/15 mb-5">
                  {order.items.map((i, n) => (
                    <div key={n} className="flex justify-between gap-3 px-4 py-3 font-body text-[0.98rem]">
                      <span className="text-charcoal">{i.name} <span className="text-charcoal-muted">× {i.qty}</span></span>
                      <span className="text-charcoal whitespace-nowrap">{formatNaira(i.price * i.qty)}</span>
                    </div>
                  ))}
                  {order.delivery_fee > 0 && <div className="flex justify-between px-4 py-3 font-body text-[0.98rem] text-charcoal-muted"><span>Delivery</span><span>{formatNaira(order.delivery_fee)}</span></div>}
                </div>
              )}
              <div className="flex justify-between items-baseline border-t-2 border-gold pt-4 mb-6">
                <span className="font-title text-[0.95rem] font-bold tracking-[0.16em] uppercase text-charcoal">Total</span>
                <span className="font-display text-3xl font-bold text-purple-rich dark:text-gold-light">{formatNaira(order.total)}</span>
              </div>
              {order.payment_status === 'paid' ? (
                <p className="flex items-center gap-2 font-body text-base text-green-700 dark:text-green-400"><CheckCircle2 size={20} /> This has been paid. Thank you!</p>
              ) : order.payable && order.payments_enabled ? (
                <>
                  <button onClick={pay} disabled={paying} className="btn-maxims btn-gold-solid w-full justify-center disabled:opacity-50">
                    <CreditCard size={16} /> {paying ? 'Opening secure payment...' : `Pay ${formatNaira(order.total)}`}
                  </button>
                  <p className="flex items-center justify-center gap-2 font-body text-[0.88rem] text-charcoal-muted mt-3 text-center"><ShieldCheck size={15} className="text-gold shrink-0" /> Card, transfer or USSD via GTCO Squad. We never see your card details.</p>
                </>
              ) : (
                <p className="font-body text-base text-charcoal-muted">
                  {order.payments_enabled ? 'This is not awaiting payment right now.' : 'Online payment is not switched on yet.'} Our team will contact you, or <Link to="/contact" className="text-gold-deep underline">get in touch</Link>.
                </p>
              )}
              {error && <p className="font-body text-[0.95rem] text-red-700 mt-3">{error}</p>}
            </>
          )}
        </div>
      </section>
    </>
  )
}
