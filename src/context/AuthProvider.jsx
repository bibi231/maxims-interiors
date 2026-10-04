import { useEffect, useState } from 'react'
import { api, setToken, getToken } from '@/lib/api'
import { authContext as AuthContext, ROLE_PERMISSIONS, useAuth } from './AuthContext'

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) { setLoading(false); return }
    api.get('/auth/me')
      .then(({ user }) => setProfile(user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  async function signIn(email, password) {
    const { token, user } = await api.post('/auth/login', { email, password })
    setToken(token)
    setProfile(user)
    return user
  }

  function signOut() {
    setToken(null)
    setProfile(null)
  }

  async function refreshProfile() {
    try { const { user } = await api.get('/auth/me'); setProfile(user) } catch { /* ignore */ }
  }

  function can(section) {
    if (!profile) return false
    return ROLE_PERMISSIONS[profile.role]?.canAccess.includes(section) ?? false
  }
  function canWrite(section) {
    if (!profile) return false
    return ROLE_PERMISSIONS[profile.role]?.canWrite.includes(section) ?? false
  }

  return (
    <AuthContext.Provider value={{
      user: profile, profile, loading,
      signIn, signOut, refreshProfile,
      can, canWrite,
      permissions: profile ? ROLE_PERMISSIONS[profile.role] : null,
      isOwner: profile?.role === 'owner',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Route guard
export function RequireAuth({ children, section }) {
  const { profile, loading, can } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center">
      <div className="text-gold font-title text-sm tracking-widest animate-pulse">LOADING...</div>
    </div>
  )

  if (!profile) {
    window.location.href = '/admin/login'
    return null
  }

  if (section && !can(section)) return (
    <div className="min-h-screen bg-charcoal-mid flex items-center justify-center text-center p-8">
      <div>
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="font-title text-lg text-gold tracking-widest mb-2">ACCESS RESTRICTED</h2>
        <p className="font-body text-cream-soft/75 text-sm">
          Your role ({profile.role.replace('_', ' ')}) does not have access to this section.
        </p>
      </div>
    </div>
  )

  return children
}
