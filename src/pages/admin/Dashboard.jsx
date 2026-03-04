// src/pages/admin/Dashboard.jsx
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, Package, Calendar, MessageSquare, Building2, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useDashboardStats, useOrders, useAppointments, useContactMessages } from '@/hooks/useData'
import { cn } from '@/lib/utils'

const fmt = n => '₦' + Number(n || 0).toLocaleString()

const STATUS_COLORS = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  processing: 'text-gold bg-gold/10',
  confirmed: 'text-blue-400 bg-blue-400/10',
  completed: 'text-green-400 bg-green-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
  delivered: 'text-green-400 bg-green-400/10',
  new: 'text-gold bg-gold/10',
  unread: 'text-yellow-400 bg-yellow-400/10',
}

function StatCard({ icon: Icon, label, value, sub, color, link, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Link to={link} className="block bg-charcoal border border-gold/8 p-5 hover:border-gold/25 transition-all duration-300 group">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('p-2', color)}>
            <Icon size={16} />
          </div>
          <ArrowRight size={12} className="text-cream-soft/15 group-hover:text-gold transition-colors mt-1" />
        </div>
        <div className="font-title text-2xl text-cream-soft font-semibold mb-1">{value}</div>
        <div className="font-body text-[0.65rem] tracking-[0.15em] uppercase text-cream-soft/30">{label}</div>
        {sub && <div className="font-body text-[0.7rem] text-cream-soft/20 mt-1">{sub}</div>}
      </Link>
    </motion.div>
  )
}

export default function Dashboard() {
  const { profile, can } = useAuth()
  const { stats, loading: statsLoading } = useDashboardStats()

  // Recent activity feeds (role-aware)
  const { data: recentOrders } = useOrders()
  const { data: recentAppts } = useAppointments()
  const { data: recentMessages } = useContactMessages({ status: 'unread' })

  const badgeCounts = {
    orders: stats?.orders?.pending ?? 0,
    appointments: stats?.appointments?.pending ?? 0,
    bulk: stats?.bulk?.new ?? 0,
    messages: stats?.messages?.unread ?? 0,
    total: (stats?.orders?.pending ?? 0) + (stats?.appointments?.pending ?? 0) + (stats?.messages?.unread ?? 0),
  }

  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <AdminLayout badgeCounts={badgeCounts}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream-soft mb-1">
          {greeting}, <em className="text-gold italic">{profile?.full_name?.split(' ')[0]}</em>
        </h1>
        <p className="font-body text-[0.8rem] text-cream-soft/30">
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid — role-aware */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-charcoal border border-gold/8 p-5 animate-pulse">
              <div className="h-4 w-4 bg-gold/10 mb-4" />
              <div className="h-7 w-16 bg-cream-soft/5 mb-2" />
              <div className="h-3 w-24 bg-cream-soft/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {can('orders') && (
            <StatCard icon={ShoppingBag} label="Pending Orders" value={stats?.orders?.pending ?? 0}
              sub={`${fmt(stats?.orders?.revenue)} total revenue`}
              color="text-gold bg-gold/8" link="/admin/orders" delay={0} />
          )}
          {can('appointments') && (
            <StatCard icon={Calendar} label="Appointments Today" value={stats?.appointments?.today ?? 0}
              sub={`${stats?.appointments?.pending ?? 0} awaiting confirmation`}
              color="text-blue-400 bg-blue-400/8" link="/admin/appointments" delay={0.07} />
          )}
          {can('bulk_requests') && (
            <StatCard icon={Building2} label="New Bulk Requests" value={stats?.bulk?.new ?? 0}
              sub={`${stats?.bulk?.total ?? 0} total submissions`}
              color="text-purple-light bg-purple-light/8" link="/admin/bulk-requests" delay={0.14} />
          )}
          {can('messages') && (
            <StatCard icon={MessageSquare} label="Unread Messages" value={stats?.messages?.unread ?? 0}
              sub={`${stats?.messages?.total ?? 0} total received`}
              color="text-green-400 bg-green-400/8" link="/admin/messages" delay={0.21} />
          )}
          {can('products') && (
            <StatCard icon={Package} label="Active Products" value={stats?.products?.active ?? 0}
              sub={stats?.products?.lowStock > 0 ? `⚠ ${stats.products.lowStock} low stock` : 'All stock levels good'}
              color="text-cream-soft/50 bg-cream-soft/5" link="/admin/products" delay={0.28} />
          )}
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Orders */}
        {can('orders') && (
          <div className="bg-charcoal border border-gold/8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gold/8">
              <h2 className="font-title text-[0.68rem] tracking-[0.2em] uppercase text-cream-soft/50">Recent Orders</h2>
              <Link to="/admin/orders" className="font-title text-[0.58rem] tracking-[0.15em] uppercase text-gold/50 hover:text-gold transition-colors">
                View All
              </Link>
            </div>
            <div className="divide-y divide-gold/5">
              {recentOrders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-gold/3 transition-colors">
                  <div>
                    <div className="font-title text-[0.68rem] text-gold/70">{order.order_number}</div>
                    <div className="font-body text-[0.78rem] text-cream-soft/55">{order.customer_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-title text-[0.75rem] text-cream-soft/60 mb-1">{fmt(order.total)}</div>
                    <span className={cn('font-body text-[0.55rem] tracking-wide uppercase px-2 py-0.5', STATUS_COLORS[order.status] || 'text-cream-soft/30')}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <div className="px-5 py-8 text-center font-body text-[0.78rem] text-cream-soft/20">No orders yet</div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        {can('appointments') && (
          <div className="bg-charcoal border border-gold/8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gold/8">
              <h2 className="font-title text-[0.68rem] tracking-[0.2em] uppercase text-cream-soft/50">Upcoming Appointments</h2>
              <Link to="/admin/appointments" className="font-title text-[0.58rem] tracking-[0.15em] uppercase text-gold/50 hover:text-gold transition-colors">
                View All
              </Link>
            </div>
            <div className="divide-y divide-gold/5">
              {recentAppts.slice(0, 5).map(appt => (
                <div key={appt.id} className="flex items-center justify-between px-5 py-3 hover:bg-gold/3 transition-colors">
                  <div>
                    <div className="font-body text-[0.8rem] text-cream-soft/65">{appt.client_name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock size={10} className="text-cream-soft/20" />
                      <span className="font-body text-[0.68rem] text-cream-soft/30">
                        {new Date(appt.preferred_date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} · {appt.preferred_time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                  <span className={cn('font-body text-[0.55rem] tracking-wide uppercase px-2 py-0.5', STATUS_COLORS[appt.status] || 'text-cream-soft/30')}>
                    {appt.status}
                  </span>
                </div>
              ))}
              {recentAppts.length === 0 && (
                <div className="px-5 py-8 text-center font-body text-[0.78rem] text-cream-soft/20">No appointments scheduled</div>
              )}
            </div>
          </div>
        )}

        {/* Unread Messages */}
        {can('messages') && recentMessages.length > 0 && (
          <div className="bg-charcoal border border-gold/8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gold/8">
              <h2 className="font-title text-[0.68rem] tracking-[0.2em] uppercase text-cream-soft/50">
                Unread Messages
                <span className="ml-2 bg-gold text-purple-darkest font-black text-[0.48rem] px-1.5 py-0.5">{recentMessages.length}</span>
              </h2>
              <Link to="/admin/messages" className="font-title text-[0.58rem] tracking-[0.15em] uppercase text-gold/50 hover:text-gold transition-colors">
                View All
              </Link>
            </div>
            <div className="divide-y divide-gold/5">
              {recentMessages.slice(0, 4).map(msg => (
                <div key={msg.id} className="px-5 py-3 hover:bg-gold/3 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-body text-[0.8rem] text-cream-soft/65">{msg.name}</div>
                      <div className="font-body text-[0.72rem] text-cream-soft/30 truncate mt-0.5">{msg.message}</div>
                    </div>
                    <div className="font-body text-[0.6rem] text-cream-soft/20 shrink-0">
                      {new Date(msg.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions — role-aware */}
        <div className="bg-charcoal border border-gold/8">
          <div className="px-5 py-4 border-b border-gold/8">
            <h2 className="font-title text-[0.68rem] tracking-[0.2em] uppercase text-cream-soft/50">Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {[
              can('products') && { label: 'Add Product', path: '/admin/products/new', icon: '📦' },
              can('gallery') && { label: 'Upload to Gallery', path: '/admin/gallery/new', icon: '🖼' },
              can('testimonials') && { label: 'Add Review', path: '/admin/testimonials/new', icon: '⭐' },
              can('team') && { label: 'Add Team Member', path: '/admin/team/new', icon: '👤' },
              can('settings') && { label: 'Site Settings', path: '/admin/settings', icon: '⚙' },
              can('activity') && { label: 'Activity Log', path: '/admin/activity', icon: '📋' },
            ].filter(Boolean).map(action => (
              <Link key={action.label} to={action.path}
                className="flex items-center gap-2.5 px-4 py-3 border border-gold/8 hover:border-gold/28 hover:bg-gold/5 transition-all group">
                <span className="text-base">{action.icon}</span>
                <span className="font-title text-[0.62rem] tracking-[0.12em] uppercase text-cream-soft/40 group-hover:text-gold transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
