// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, RequireAuth } from '@/context/AuthContext'

// Public Layout
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

// Public Pages
import Home          from '@/pages/Home'
import About         from '@/pages/About'
import Shop          from '@/pages/Shop'
import Gallery       from '@/pages/Gallery'
import InteriorDecor from '@/pages/InteriorDecor'
import BulkOrders    from '@/pages/BulkOrders'
import Contact       from '@/pages/Contact'
import Testimonials  from '@/pages/Testimonials'
import Team          from '@/pages/Team'

// Admin Pages (lazy-loaded for performance)
import { lazy, Suspense } from 'react'
const AdminLogin       = lazy(() => import('@/pages/admin/Login'))
const AdminDashboard   = lazy(() => import('@/pages/admin/Dashboard'))
const AdminOrders      = lazy(() => import('@/pages/admin/Orders'))
const AdminProducts    = lazy(() => import('@/pages/admin/Products'))
const AdminAppointments= lazy(() => import('@/pages/admin/Appointments'))
const AdminBulkReqs    = lazy(() => import('@/pages/admin/BulkRequests'))
const AdminMessages    = lazy(() => import('@/pages/admin/Messages'))
const AdminGallery     = lazy(() => import('@/pages/admin/Gallery'))
const AdminTestimonials= lazy(() => import('@/pages/admin/Testimonials'))
const AdminTeam        = lazy(() => import('@/pages/admin/Team'))
const AdminSettings    = lazy(() => import('@/pages/admin/Settings'))
const AdminActivity    = lazy(() => import('@/pages/admin/Activity'))

const AdminLoader = () => (
  <div className="min-h-screen bg-charcoal flex items-center justify-center">
    <div className="font-title text-sm tracking-widest text-gold animate-pulse">LOADING...</div>
  </div>
)

const pageTransition = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4,0,0.2,1] } },
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
          <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
          <Route path="/interior-decor" element={<PublicLayout><InteriorDecor /></PublicLayout>} />
          <Route path="/bulk-orders" element={<PublicLayout><BulkOrders /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
          <Route path="/testimonials" element={<PublicLayout><Testimonials /></PublicLayout>} />
          <Route path="/team" element={<PublicLayout><Team /></PublicLayout>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Admin Routes — no public layout, protected */}
          <Route path="/admin/login" element={
            <Suspense fallback={<AdminLoader />}><AdminLogin /></Suspense>
          }/>
          <Route path="/admin" element={
            <RequireAuth section="dashboard">
              <Suspense fallback={<AdminLoader />}><AdminDashboard /></Suspense>
            </RequireAuth>
          }/>
          <Route path="/admin/orders" element={
            <RequireAuth section="orders">
              <Suspense fallback={<AdminLoader />}><AdminOrders /></Suspense>
            </RequireAuth>
          }/>
          <Route path="/admin/products" element={
            <RequireAuth section="products">
              <Suspense fallback={<AdminLoader />}><AdminProducts /></Suspense>
            </RequireAuth>
          }/>
          <Route path="/admin/appointments" element={
            <RequireAuth section="appointments">
              <Suspense fallback={<AdminLoader />}><AdminAppointments /></Suspense>
            </RequireAuth>
          }/>
          <Route path="/admin/bulk-requests" element={
            <RequireAuth section="bulk_requests">
              <Suspense fallback={<AdminLoader />}><AdminBulkReqs /></Suspense>
            </RequireAuth>
          }/>
          <Route path="/admin/messages" element={
            <RequireAuth section="messages">
              <Suspense fallback={<AdminLoader />}><AdminMessages /></Suspense>
            </RequireAuth>
          }/>
          <Route path="/admin/gallery" element={
            <RequireAuth section="gallery">
              <Suspense fallback={<AdminLoader />}><AdminGallery /></Suspense>
            </RequireAuth>
          }/>
          <Route path="/admin/testimonials" element={
            <RequireAuth section="testimonials">
              <Suspense fallback={<AdminLoader />}><AdminTestimonials /></Suspense>
            </RequireAuth>
          }/>
          <Route path="/admin/team" element={
            <RequireAuth section="team">
              <Suspense fallback={<AdminLoader />}><AdminTeam /></Suspense>
            </RequireAuth>
          }/>
          <Route path="/admin/settings" element={
            <RequireAuth section="settings">
              <Suspense fallback={<AdminLoader />}><AdminSettings /></Suspense>
            </RequireAuth>
          }/>
          <Route path="/admin/activity" element={
            <RequireAuth section="activity">
              <Suspense fallback={<AdminLoader />}><AdminActivity /></Suspense>
            </RequireAuth>
          }/>

          {/* All public routes */}
          <Route path="/*" element={<AnimatedPublicRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
