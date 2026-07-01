// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { AuthProvider, RequireAuth } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import ToastContainer from '@/components/admin/ToastContainer'
import ScrollToTop from '@/components/ScrollToTop'
import SupportChat from '@/components/SupportChat'

// Public Layout
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

// Public Pages
import Home          from '@/pages/Home'
import About         from '@/pages/About'
import Shop          from '@/pages/Shop'
import ProductDetail from '@/pages/ProductDetail'
import Gallery       from '@/pages/Gallery'
import InteriorDecor from '@/pages/InteriorDecor'
import BulkOrders    from '@/pages/BulkOrders'
import Contact       from '@/pages/Contact'
import Testimonials  from '@/pages/Testimonials'
import Team          from '@/pages/Team'
import PaymentCallback from '@/pages/PaymentCallback'
import NotFound      from '@/pages/NotFound'

// Admin Pages (lazy-loaded for performance)
const AdminLogin        = lazy(() => import('@/pages/admin/Login'))
const AdminDashboard    = lazy(() => import('@/pages/admin/Dashboard'))
const AdminOrders       = lazy(() => import('@/pages/admin/Orders'))
const AdminTransactions = lazy(() => import('@/pages/admin/Transactions'))
const AdminProducts     = lazy(() => import('@/pages/admin/Products'))
const AdminAppointments = lazy(() => import('@/pages/admin/Appointments'))
const AdminBulkReqs     = lazy(() => import('@/pages/admin/BulkRequests'))
const AdminMessages     = lazy(() => import('@/pages/admin/Messages'))
const AdminGallery      = lazy(() => import('@/pages/admin/Gallery'))
const AdminTestimonials = lazy(() => import('@/pages/admin/Testimonials'))
const AdminTeam         = lazy(() => import('@/pages/admin/Team'))
const AdminNewsletter   = lazy(() => import('@/pages/admin/Newsletter'))
const AdminSettings     = lazy(() => import('@/pages/admin/Settings'))
const AdminActivity     = lazy(() => import('@/pages/admin/Activity'))

const AdminLoader = () => (
  <div className="min-h-screen bg-charcoal flex items-center justify-center">
    <div className="font-title text-sm tracking-widest text-gold animate-pulse">LOADING...</div>
  </div>
)

const pageTransition = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}

function AnimatedPublicRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...pageTransition}>
        <Routes location={location}>
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/shop" element={<PublicLayout><Shop /></PublicLayout>} />
          <Route path="/shop/:slug" element={<PublicLayout><ProductDetail /></PublicLayout>} />
          <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
          <Route path="/interior-decor" element={<PublicLayout><InteriorDecor /></PublicLayout>} />
          <Route path="/bulk-orders" element={<PublicLayout><BulkOrders /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
          <Route path="/testimonials" element={<PublicLayout><Testimonials /></PublicLayout>} />
          <Route path="/team" element={<PublicLayout><Team /></PublicLayout>} />
          <Route path="/payment/callback" element={<PublicLayout><PaymentCallback /></PublicLayout>} />
          <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

const protect = (section, El) => (
  <RequireAuth section={section}><Suspense fallback={<AdminLoader />}>{El}</Suspense></RequireAuth>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ScrollToTop />
          <SupportChat />
          <Routes>
            {/* Admin Routes — no public layout, protected */}
            <Route path="/admin/login" element={<Suspense fallback={<AdminLoader />}><AdminLogin /></Suspense>} />
            <Route path="/admin" element={protect('dashboard', <AdminDashboard />)} />
            <Route path="/admin/orders" element={protect('orders', <AdminOrders />)} />
            <Route path="/admin/transactions" element={protect('transactions', <AdminTransactions />)} />
            <Route path="/admin/products" element={protect('products', <AdminProducts />)} />
            <Route path="/admin/appointments" element={protect('appointments', <AdminAppointments />)} />
            <Route path="/admin/bulk-requests" element={protect('bulk_requests', <AdminBulkReqs />)} />
            <Route path="/admin/messages" element={protect('messages', <AdminMessages />)} />
            <Route path="/admin/gallery" element={protect('gallery', <AdminGallery />)} />
            <Route path="/admin/testimonials" element={protect('testimonials', <AdminTestimonials />)} />
            <Route path="/admin/team" element={protect('team', <AdminTeam />)} />
            <Route path="/admin/newsletter" element={protect('newsletter', <AdminNewsletter />)} />
            <Route path="/admin/settings" element={protect('settings', <AdminSettings />)} />
            <Route path="/admin/activity" element={protect('activity', <AdminActivity />)} />

            {/* All public routes */}
            <Route path="/*" element={<AnimatedPublicRoutes />} />
          </Routes>
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
