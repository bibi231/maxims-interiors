// src/components/admin/AdminLayout.jsx
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Package, ShoppingBag, Users, Calendar,
  MessageSquare, Images, Star, Settings, Activity,
  LogOut, Menu, X, ChevronRight, Bell, User, Building2,
} from 'lucide-react'
import { useAuth, ROLE_PERMISSIONS } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

// All possible nav items — filtered by role
const ALL_NAV = [
  { section: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard',     path: '/admin' },
  { section: 'orders',       icon: ShoppingBag,     label: 'Orders',        path: '/admin/orders',        badge: 'orders' },
  { section: 'products',     icon: Package,         label: 'Products',      path: '/admin/products' },
  { section: 'appointments', icon: Calendar,        label: 'Appointments',  path: '/admin/appointments',  badge: 'appointments' },
  { section: 'bulk_requests',icon: Building2,       label: 'Bulk Requests', path: '/admin/bulk-requests', badge: 'bulk' },
  { section: 'messages',     icon: MessageSquare,   label: 'Messages',      path: '/admin/messages',      badge: 'messages' },
  { section: 'gallery',      icon: Images,          label: 'Gallery',       path: '/admin/gallery' },
  { section: 'testimonials', icon: Star,            label: 'Testimonials',  path: '/admin/testimonials' },
  { section: 'team',         icon: Users,           label: 'Team',          path: '/admin/team' },
  { section: 'activity',     icon: Activity,        label: 'Activity Log',  path: '/admin/activity' },
  { section: 'settings',     icon: Settings,        label: 'Settings',      path: '/admin/settings' },
]

// Role badge colours
const ROLE_BADGES = {
  owner:            'bg-gold/15 text-gold',
  senior_designer:  'bg-purple-light/15 text-purple-light',
  project_manager:  'bg-blue-400/15 text-blue-400',
  shop_manager:     'bg-green-400/15 text-green-400',
  content_editor:   'bg-cream-soft/10 text-cream-soft',
}

export default function AdminLayout({ children, badgeCounts = {} }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const { profile, signOut, can } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const visibleNav = ALL_NAV.filter(item => can(item.section))

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gold/10 flex items-center justify-between">
        <div>
          <div className="font-title text-[0.9rem] tracking-[0.28em] text-gold font-bold leading-none">MAXIMS</div>
          <div className="font-body text-[0.42rem] tracking-[0.2em] uppercase text-gold/30 mt-1">Admin Dashboard</div>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="text-cream-soft hover:text-gold transition-colors hidden lg:block">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Profile Card */}
      <div className="px-4 py-4 border-b border-gold/8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-rich border border-gold/20 flex items-center justify-center shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" />
              : <span className="font-title text-xs text-gold">{profile?.full_name?.[0] ?? '?'}</span>
            }
          </div>
          <div className="min-w-0">
            <div className="font-title text-[0.68rem] tracking-wide text-cream-soft truncate leading-none mb-1">
              {profile?.full_name}
            </div>
            <span className={cn('font-body text-[0.5rem] tracking-[0.1em] uppercase px-1.5 py-0.5', ROLE_BADGES[profile?.role])}>
              {ROLE_PERMISSIONS[profile?.role]?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleNav.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/admin' && location.pathname.startsWith(item.path))
          const count = badgeCounts[item.badge] ?? 0

          return (
            <Link key={item.path} to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 mb-0.5 font-body text-[0.75rem] transition-all duration-200 group relative',
                isActive
                  ? 'bg-gold/10 text-gold'
                  : 'text-cream-soft hover:text-gold hover:bg-gold/5',
              )}
              onClick={() => setMobileSidebar(false)}
            >
              {isActive && <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-gold" />}
              <item.icon size={15} className={isActive ? 'text-gold' : 'text-cream-soft group-hover:text-gold'} />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span className="bg-gold text-purple-darkest dark:text-cream-soft font-body font-black text-[0.5rem] leading-none px-1.5 py-0.5 min-w-[18px] text-center">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-gold/8 space-y-0.5">
        <Link to="/" target="_blank"
          className="flex items-center gap-3 px-3 py-2 font-body text-[0.72rem] text-cream-soft hover:text-gold transition-colors">
          <span className="text-xs">↗</span> View Live Site
        </Link>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 font-body text-[0.72rem] text-cream-soft hover:text-red-400 transition-colors">
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-charcoal-mid overflow-hidden">
      {/* Desktop Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="hidden lg:flex flex-col bg-purple-darkest border-r border-gold/10 shrink-0 overflow-hidden"
            style={{ width: 240 }}
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Collapsed sidebar toggle */}
      {!sidebarOpen && (
        <div className="hidden lg:flex flex-col items-center py-5 w-14 bg-purple-darkest border-r border-gold/10 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-gold/40 hover:text-gold transition-colors mb-6">
            <Menu size={18} />
          </button>
          {visibleNav.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path}
                className={cn('p-2.5 mb-0.5 transition-colors', isActive ? 'text-gold' : 'text-cream-soft hover:text-gold')}>
                <item.icon size={16} />
              </Link>
            )
          })}
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-charcoal/70 z-[200] lg:hidden"
              onClick={() => setMobileSidebar(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.28 }}
              className="fixed top-0 left-0 bottom-0 w-[260px] z-[201] bg-purple-darkest border-r border-gold/10 flex flex-col lg:hidden"
            >
              <div className="flex justify-end p-4">
                <button onClick={() => setMobileSidebar(false)} className="text-gold/40 hover:text-gold">
                  <X size={18} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-charcoal border-b border-gold/8 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSidebarOpen(s => !s); setMobileSidebar(s => !s) }}
              className="text-cream-soft hover:text-gold transition-colors">
              <Menu size={18} />
            </button>
            <div className="hidden sm:flex items-center gap-1 text-cream-soft font-body text-[0.72rem]">
              <span>Admin</span>
              {location.pathname !== '/admin' && (
                <>
                  <ChevronRight size={10} />
                  <span className="text-gold capitalize">
                    {location.pathname.split('/').pop().replace(/-/g, ' ')}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative text-cream-soft hover:text-gold transition-colors">
              <Bell size={16} />
              {(badgeCounts.total ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gold rounded-full text-[0.4rem] text-purple-darkest dark:text-cream-soft font-black flex items-center justify-center">
                  {badgeCounts.total > 9 ? '9+' : badgeCounts.total}
                </span>
              )}
            </button>
            <Link to="/admin/settings" className="text-cream-soft hover:text-gold transition-colors">
              <User size={16} />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
