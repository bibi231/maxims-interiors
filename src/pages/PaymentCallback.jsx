// src/pages/PaymentCallback.jsx
// Public route the gateway redirects to after checkout.
// Verifies the reference server-side and shows the result.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Meta from '@/components/Meta'
import { verifyPayment } from '@/hooks/usePayment'
import { formatNaira } from '@/lib/utils'

export default function PaymentCallback() {
  const [params] = useSearchParams()
  // Squad uses ?reference= , Paystack uses ?reference= or ?trxref=
  const reference = params.get('reference') || params.get('trxref')
  const [state, setState] = useState('verifying') // verifying | success | failed
  const [txn, setTxn] = useState(null)

  useEffect(() => {
    let active = true
    if (!reference) { setState('failed'); return }
    verifyPayment(reference)
      .then((res) => {
        if (!active) return
        setTxn(res.transaction || null)
        setState(res.status === 'success' ? 'success' : 'failed')
      })
      .catch(() => active && setState('failed'))
    return () => { active = false }
  }, [reference])

  return (
    <>
      <Meta title="Payment — Maxims Interiors" noindex />
      <section className="min-h-screen grid place-items-center bg-charcoal bg-lux-radial px-5 pt-28 pb-16">
        <div className="card-glass max-w-md w-full p-10 text-center">
          {state === 'verifying' && (
            <>
              <Loader2 size={42} className="text-gold mx-auto animate-spin" />
              <h1 className="text-display-md mt-6">Verifying payment…</h1>
              <p className="mt-3 font-body text-cream-soft/55">Please wait while we confirm your transaction.</p>
            </>
          )}
          {state === 'success' && (
            <>
              <CheckCircle2 size={48} className="text-green-400 mx-auto" />
              <h1 className="text-display-md mt-6">Payment Successful</h1>
              <p className="mt-3 font-body text-cream-soft/60">
                Thank you{txn?.customer_name ? `, ${txn.customer_name.split(' ')[0]}` : ''}!
                {txn?.amount ? ` We've received ${formatNaira(txn.amount)}.` : ''}
              </p>
              {txn?.reference && <p className="mt-2 font-body text-xs text-cream-soft/35">Ref: {txn.reference}</p>}
              <Link to="/" className="btn-gold-solid mt-8">Back to Home</Link>
            </>
          )}
          {state === 'failed' && (
            <>
              <XCircle size={48} className="text-red-400 mx-auto" />
              <h1 className="text-display-md mt-6">Payment Not Confirmed</h1>
              <p className="mt-3 font-body text-cream-soft/60">
                We couldn't confirm this payment. If you were charged, please contact us with your reference and we'll sort it out right away.
              </p>
              <div className="mt-8 flex gap-3 justify-center">
                <Link to="/contact" className="btn-gold-solid">Contact Us</Link>
                <Link to="/shop" className="btn-outline-light">Back to Shop</Link>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
