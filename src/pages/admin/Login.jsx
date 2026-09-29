// src/pages/admin/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

export default function AdminLogin() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [resetSent, setResetSent] = useState('')
  const [mode, setMode] = useState('login') // login | forgot
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError(''); setResetSent('')
    if (!email) return setError('Enter your email address first.')
    setLoading(true)
    try {
      const r = await api.post('/auth/forgot-password', { email: email.trim() })
      setResetSent(r.message || 'If that email belongs to a staff account, a reset link is on its way.')
    } catch (err) {
      setError(err.message || 'Could not send the reset email. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,31,107,0.3), #12111A 60%)' }}>

      <motion.div
        className="w-full max-w-[400px]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full border border-gold/50 flex items-center justify-center mx-auto mb-4"
            style={{ boxShadow: '0 0 30px rgba(201,168,76,0.15)' }}>
            <span className="font-title text-2xl text-gold font-bold">M</span>
          </div>
          <div className="font-title text-lg tracking-[0.3em] text-gold font-bold">MAXIMS</div>
          <div className="font-body text-[0.76rem] tracking-[0.25em] uppercase text-gold/75 mt-1">Admin Portal</div>
        </div>

        {/* Card */}
        <div className="bg-charcoal-mid border border-gold/12 p-8">
          <h1 className="font-display text-2xl text-cream-soft mb-1">{mode === 'login' ? 'Welcome back' : 'Reset password'}</h1>
          <p className="font-body text-[0.9rem] text-cream-soft/70 mb-8">{mode === 'login' ? 'Sign in with your Maxims staff email' : 'We will email you a link to choose a new password'}</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="font-body text-[0.9rem] text-red-400">{error}</span>
            </div>
          )}

          {resetSent && (
            <div className="bg-green-500/10 border border-green-500/20 px-4 py-3 mb-5">
              <span className="font-body text-[0.9rem] text-green-400">{resetSent}</span>
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleSubmit : handleForgotPassword} className="space-y-4">
            <div>
              <label className="font-title text-[0.76rem] tracking-[0.2em] uppercase text-cream-soft/75 block mb-2">
                Email Address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-charcoal border border-gold/12 px-4 py-3 font-body text-[0.88rem] text-cream-soft
                           placeholder:text-cream-soft/45 focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="you@maximsinterior.com.ng"
              />
            </div>
            {mode === 'login' && <div>
              <label className="font-title text-[0.76rem] tracking-[0.2em] uppercase text-cream-soft/75 block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-charcoal border border-gold/12 px-4 py-3 pr-11 font-body text-[0.88rem] text-cream-soft
                             placeholder:text-cream-soft/45 focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-soft/70 hover:text-gold transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>}

            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest
                         font-title text-[0.76rem] tracking-[0.2em] uppercase py-3.5 flex items-center justify-center gap-2
                         hover:shadow-[0_4px_20px_rgba(201,168,76,0.35)] transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="animate-pulse">{mode === 'login' ? 'Signing in...' : 'Sending...'}</span>
              ) : mode === 'login' ? (
                <><LogIn size={14} /> Sign In</>
              ) : 'Email me a reset link'}
            </button>
          </form>

          <button type="button" onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setError(''); setResetSent('') }}
            className="w-full text-center font-body text-[0.9rem] text-cream-soft/75 hover:text-gold transition-colors mt-5 py-1">
            {mode === 'login' ? 'Forgot your password?' : 'Back to sign in'}
          </button>
        </div>

        <p className="text-center font-body text-[0.76rem] text-cream-soft/60 mt-6">
          Maxims Interiors & Home Goods · Admin Portal
        </p>
      </motion.div>
    </div>
  )
}
