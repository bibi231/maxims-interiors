// src/context/AuthContext.jsx
// JWT auth against the Express API. `profile` mirrors `user` (the API
// returns one user object with role/full_name), keeping admin pages that
// read `profile.*` unchanged.
import { createContext, useContext } from 'react'

export const authContext = createContext(null)

// Role permission map — UI gating. The server enforces the same rules.
export const ROLE_PERMISSIONS = {
  owner: {
    label: 'Owner',
    color: 'text-gold bg-gold/10',
    canAccess: ['dashboard', 'products', 'orders', 'transactions', 'bulk_requests', 'appointments',
                'messages', 'gallery', 'testimonials', 'team', 'newsletter', 'settings', 'activity', 'blog', 'pricing'],
    canWrite:  ['products', 'orders', 'transactions', 'bulk_requests', 'appointments', 'messages',
                'gallery', 'testimonials', 'team', 'newsletter', 'settings', 'blog', 'pricing'],
    canDelete: true, canInviteTeam: true, canChangeRoles: true,
  },
  senior_designer: {
    label: 'Senior Designer',
    color: 'text-purple-light bg-purple-light/10',
    canAccess: ['dashboard', 'appointments', 'bulk_requests', 'gallery', 'testimonials', 'orders', 'settings', 'blog'],
    canWrite:  ['appointments', 'bulk_requests', 'gallery', 'testimonials', 'blog'],
    canDelete: false, canInviteTeam: false, canChangeRoles: false,
  },
  project_manager: {
    label: 'Project Manager',
    color: 'text-blue-400 bg-blue-400/10',
    canAccess: ['dashboard', 'appointments', 'bulk_requests', 'messages', 'orders', 'transactions', 'settings'],
    canWrite:  ['appointments', 'bulk_requests', 'messages', 'orders'],
    canDelete: false, canInviteTeam: false, canChangeRoles: false,
  },
  shop_manager: {
    label: 'Shop Manager',
    color: 'text-green-400 bg-green-400/10',
    canAccess: ['dashboard', 'products', 'orders', 'transactions', 'settings'],
    canWrite:  ['products', 'orders', 'transactions'],
    canDelete: false, canInviteTeam: false, canChangeRoles: false,
  },
  content_editor: {
    label: 'Content Editor',
    color: 'text-cream-soft/70 bg-cream-soft/8',
    canAccess: ['dashboard', 'gallery', 'testimonials', 'settings', 'blog'],
    canWrite:  ['gallery', 'testimonials', 'blog'],
    canDelete: false, canInviteTeam: false, canChangeRoles: false,
  },
}

export function useAuth() {
  const ctx = useContext(authContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
