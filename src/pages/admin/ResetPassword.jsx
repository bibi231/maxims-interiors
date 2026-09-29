// src/pages/admin/ResetPassword.jsx
// Landing page for password-reset and new-staff set-up links.
import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, KeyRound } from 'lucide-react'
import { api, setToken } from '@/lib/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const welcome = params.get('welcome') === '1'
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (pwd.length < 8) return setError('Password must be at least 8 characters.')
    if (pwd !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    try {
      const { token: session } = await api.post('/auth/reset-password', { token, password: pwd })
      setToken(session)
      window.location.href = '/admin' // full load so AuthContext picks up the new session
    } catch (err) {
      setError(err.message || 'Could not set your password.')
      setBusy(false)
    }
  }

  const inputCls = 'w-full bg-charcoal border border-gold/12 px-4 py-3 font-body text-[0.88rem] text-cream-soft placeholder:text-cream-soft/45 focus:outline-none focus:border-gold/50'

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,31,107,0.3), #12111A 60%)' }}>
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="font-title text-lg tracking-[0.3em] text-gold font-bold">MAXIMS</div>
          <div className="font-body text-[0.76rem] tracking-[0.25em] uppercase text-gold/75 mt-1">Admin Portal</div>
        </div>
        <div className="bg-charcoal-mid border border-gold/12 p-8">
          <KeyRound size={22} className="text-gold mb-3" />
          <h1 className="font-display text-2xl text-cream-soft mb-1">{welcome ? 'Set your password' : 'Choose a new password'}</h1>
          <p className="font-body text-[0.9rem] text-cream-soft/75 mb-6">{welcome ? 'Welcome to the Maxims team. Choose a password to finish setting up your account.' : 'Enter a new password for your admin account.'}</p>

          {!token ? (
            <p className="font-body text-[0.95rem] text-yellow-400">This link is incomplete. <Link to="/admin/login" className="underline">Request a new reset link</Link>.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 px-4 py-3">
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="font-body text-[0.9rem] text-red-400">{error}</span>
                </div>
              )}
              <div className="relative">
                <input type={show ? 'text' : 'password'} className={inputCls + ' pr-11'} value={pwd} onChange={e => setPwd(e.target.value)} placeholder="New password (min. 8 characters)" autoComplete="new-password" autoFocus />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-soft/70 hover:text-gold">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input type={show ? 'text' : 'password'} className={inputCls} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password" autoComplete="new-password" />
              <button disabled={busy} className="w-full bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.76rem] tracking-[0.2em] uppercase py-3.5 disabled:opacity-50">
                {busy ? 'Saving...' : 'Save password and sign in'}
              </button>
              <Link to="/admin/login" className="block text-center font-body text-[0.84rem] text-cream-soft/75 hover:text-gold">Back to sign in</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
