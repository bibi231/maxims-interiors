// src/context/AuthContext.jsx
// JWT auth against the Express API. `profile` mirrors `user` (the API
// returns one user object with role/full_name), keeping admin pages that
// read `profile.*` unchanged.
import { createContext, useContext, useEffect, useState } from 'react'
import { api, setToken, getToken } from '@/lib/api'

const AuthContext = createContext(null)

// Role permission map — UI gating. The server enforces the same rules.
export const ROLE_PERMISSIONS = {
  owner: {
    label: 'Owner',
    color: 'text-gold bg-gold/10',
    canAccess: ['dashboard', 'products', 'orders', 'transactions', 'bulk_requests', 'appointments',
                'messages', 'gallery', 'testimonials', 'team', 'newsletter', 'settings', 'activity'],
    canWrite:  ['products', 'orders', 'transactions', 'bulk_requests', 'appointments', 'messages',
                'gallery', 'testimonials', 'team', 'newsletter', 'settings'],
    canDelete: true, canInviteTeam: true, canChangeRoles: true,
  },
  senior_designer: {
    label: 'Senior Designer',
    color: 'text-purple-light bg-purple-light/10',
    canAccess: ['dashboard', 'appointments', 'bulk_requests', 'gallery', 'testimonials', 'orders'],
    canWrite:  ['appointments', 'bulk_requests', 'gallery', 'testimonials'],
    canDelete: false, canInviteTeam: false, canChangeRoles: false,
  },
  project_manager: {
    label: 'Project Manager',
    color: 'text-blue-400 bg-blue-400/10',
    canAccess: ['dashboard', 'appointments', 'bulk_requests', 'messages', 'orders', 'transactions'],
    canWrite:  ['appointments', 'bulk_requests', 'messages', 'orders'],
    canDelete: false, canInviteTeam: false, canChangeRoles: false,
  },
  shop_manager: {
    label: 'Shop Manager',
    color: 'text-green-400 bg-green-400/10',
    canAccess: ['dashboard', 'products', 'orders', 'transactions'],
    canWrite:  ['products', 'orders', 'transactions'],
    canDelete: false, canInviteTeam: false, canChangeRoles: false,
  },
  content_editor: {
    label: 'Content Editor',
    color: 'text-cream-soft/70 bg-cream-soft/8',
    canAccess: ['dashboard', 'gallery', 'testimonials'],
    canWrite:  ['gallery', 'testimonials'],
    canDelete: false, canInviteTeam: false, canChangeRoles: false,
  },
}

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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
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
        <p className="font-body text-cream-soft/40 text-sm">
          Your role ({profile.role.replace('_', ' ')}) does not have access to this section.
        </p>
      </div>
    </div>
  )

  return children
}
