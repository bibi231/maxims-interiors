// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

// Role permission map — what each role can access in the admin
export const ROLE_PERMISSIONS = {
  owner: {
    label: 'Owner',
    color: 'text-gold bg-gold/10',
    canAccess: ['dashboard', 'products', 'orders', 'bulk_requests', 'appointments',
                'messages', 'gallery', 'testimonials', 'team', 'settings', 'activity'],
    canWrite:  ['products', 'orders', 'bulk_requests', 'appointments', 'messages',
                'gallery', 'testimonials', 'team', 'settings'],
    canDelete: true,
    canInviteTeam: true,
    canChangeRoles: true,
  },
  senior_designer: {
    label: 'Senior Designer',
    color: 'text-purple-light bg-purple-light/10',
    canAccess: ['dashboard', 'appointments', 'bulk_requests', 'gallery', 'testimonials', 'orders'],
    canWrite:  ['appointments', 'bulk_requests', 'gallery', 'testimonials'],
    canDelete: false,
    canInviteTeam: false,
    canChangeRoles: false,
  },
  project_manager: {
    label: 'Project Manager',
    color: 'text-blue-400 bg-blue-400/10',
    canAccess: ['dashboard', 'appointments', 'bulk_requests', 'messages', 'orders'],
    canWrite:  ['appointments', 'bulk_requests', 'messages', 'orders'],
    canDelete: false,
    canInviteTeam: false,
    canChangeRoles: false,
  },
  shop_manager: {
    label: 'Shop Manager',
    color: 'text-green-400 bg-green-400/10',
    canAccess: ['dashboard', 'products', 'orders'],
    canWrite:  ['products', 'orders'],
    canDelete: false,
    canInviteTeam: false,
    canChangeRoles: false,
  },
  content_editor: {
    label: 'Content Editor',
    color: 'text-cream-soft bg-cream-soft/8',
    canAccess: ['dashboard', 'gallery', 'testimonials'],
    canWrite:  ['gallery', 'testimonials'],
    canDelete: false,
    canInviteTeam: false,
    canChangeRoles: false,
  },
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch the profile (role, name, etc.) for the authenticated user
  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error && data) setProfile(data)
    return data
  }

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
        // Update last_seen
        supabase.from('profiles').update({ last_seen: new Date().toISOString() })
          .eq('id', session.user.id).then(() => {})
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    })
    if (error) throw error
  }

  // Check if current user has access to a section
  function can(section) {
    if (!profile) return false
    const perms = ROLE_PERMISSIONS[profile.role]
    return perms?.canAccess.includes(section) ?? false
  }

  // Check if current user can write to a section
  function canWrite(section) {
    if (!profile) return false
    const perms = ROLE_PERMISSIONS[profile.role]
    return perms?.canWrite.includes(section) ?? false
  }

  const permissions = profile ? ROLE_PERMISSIONS[profile.role] : null

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signOut, resetPassword,
      can, canWrite, permissions,
      isOwner: profile?.role === 'owner',
      refreshProfile: () => user && fetchProfile(user.id),
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

// Guard component — wrap any admin route with this
export function RequireAuth({ children, section }) {
  const { user, profile, loading, can } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center">
      <div className="text-gold font-title text-sm tracking-widest animate-pulse">LOADING...</div>
    </div>
  )

  if (!user || !profile) {
    window.location.href = '/admin/login'
    return null
  }

  if (section && !can(section)) return (
    <div className="min-h-screen bg-charcoal-mid flex items-center justify-center text-center p-8">
      <div>
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="font-title text-lg text-gold tracking-widest mb-2">ACCESS RESTRICTED</h2>
        <p className="font-body text-cream-soft text-sm">
          Your role ({profile.role.replace('_', ' ')}) does not have access to this section.
        </p>
      </div>
    </div>
  )

  return children
}
