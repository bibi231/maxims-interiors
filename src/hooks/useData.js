// src/hooks/useData.js
// ============================================================
// Data layer over the Maxims Express + MongoDB API.
// Public function names + return shapes are unchanged from the
// previous version, so page components didn't need rewriting.
// Hooks return { data, loading, error, refresh }.
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { api, qs } from '@/lib/api'

// ── Generic fetch hook (optional polling for near-realtime views) ──
function useApi(path, { poll = 0 } = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pathRef = useRef(path)
  pathRef.current = path

  const refresh = useCallback(async () => {
    try {
      const rows = await api.get(pathRef.current)
      setData(Array.isArray(rows) ? rows : [])
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    refresh()
    if (!poll) return
    const id = setInterval(refresh, poll)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [path, poll, refresh])

  return { data, loading, error, refresh }
}

const stripId = ({ id, _id, ...rest }) => rest // never POST/PUT the id in the body

// ============================================================
// DASHBOARD STATS
// ============================================================
export function useDashboardStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/stats/dashboard').then(setStats).catch(() => setStats(null)).finally(() => setLoading(false))
  }, [])
  return { stats, loading }
}

// ============================================================
// PRODUCTS
// ============================================================
export function useProducts(filters = {}) {
  return useApi(`/products${qs({ status: filters.status, category: filters.category, featured: filters.featured ? 'true' : undefined })}`)
}
export async function upsertProduct(product) {
  return product.id ? api.put(`/products/${product.id}`, stripId(product)) : api.post('/products', stripId(product))
}
export async function deleteProduct(id) { return api.del(`/products/${id}`) }
export async function updateProductStatus(id, status) { return api.put(`/products/${id}`, { status }) }

// ============================================================
// ORDERS
// ============================================================
export function useOrders(filters = {}) {
  return useApi(`/orders${qs({ status: filters.status, search: filters.search })}`, { poll: 20000 })
}
export async function updateOrderStatus(id, status) { return api.patch(`/orders/${id}`, { status }) }
export async function assignOrder(orderId, profileId) { return api.patch(`/orders/${orderId}`, { assigned_to: profileId }) }
export async function placeOrder(orderData) { return api.post('/orders', orderData) }

// ============================================================
// BULK REQUESTS
// ============================================================
export function useBulkRequests(filters = {}) {
  return useApi(`/bulk${qs({ status: filters.status })}`, { poll: 20000 })
}
export async function updateBulkStatus(id, status, notes = '') { return api.patch(`/bulk/${id}`, { status, internal_notes: notes }) }
export async function updateBulkRequest(id, patch) { return api.patch(`/bulk/${id}`, patch) }
export async function submitBulkRequest(formData) { return api.post('/bulk', formData) }

// ============================================================
// APPOINTMENTS
// ============================================================
export function useAppointments(filters = {}) {
  return useApi(`/appointments${qs({ status: filters.status, date: filters.date })}`, { poll: 20000 })
}
export async function updateAppointmentStatus(id, status) { return api.patch(`/appointments/${id}`, { status }) }
export async function bookAppointment(formData) { return api.post('/appointments', formData) }
export async function checkSlotAvailability(date, time) {
  const { available } = await api.get(`/appointments/availability${qs({ date, time })}`)
  return available
}

// ============================================================
// CONTACT MESSAGES
// ============================================================
export function useContactMessages(filters = {}) {
  return useApi(`/messages${qs({ status: filters.status })}`, { poll: 20000 })
}
export async function markMessageRead(id) { return api.patch(`/messages/${id}/read`) }
export async function replyToMessage(id, replyText) { return api.patch(`/messages/${id}`, { reply_text: replyText }) }
export async function archiveMessage(id) { return api.patch(`/messages/${id}`, { status: 'archived' }) }
export async function submitContactForm(formData) { return api.post('/messages', formData) }

// ============================================================
// GALLERY
// ============================================================
export function useGallery(filters = {}) {
  return useApi(`/gallery${qs({ published: filters.published === undefined ? undefined : String(filters.published), category: filters.category, featured: filters.featured ? 'true' : undefined })}`)
}
export async function upsertGalleryProject(project) {
  return project.id ? api.put(`/gallery/${project.id}`, stripId(project)) : api.post('/gallery', stripId(project))
}
export async function deleteGalleryProject(id) { return api.del(`/gallery/${id}`) }

// ============================================================
// TESTIMONIALS
// ============================================================
export function useTestimonials(filters = {}) {
  return useApi(`/testimonials${qs({ published: filters.published === undefined ? undefined : String(filters.published), featured: filters.featured ? 'true' : undefined })}`)
}
export async function upsertTestimonial(testi) {
  return testi.id ? api.put(`/testimonials/${testi.id}`, stripId(testi)) : api.post('/testimonials', stripId(testi))
}
export async function deleteTestimonial(id) { return api.del(`/testimonials/${id}`) }

// ============================================================
// TEAM MEMBERS
// ============================================================
export function useTeamMembers(onlyPublished = false) {
  return useApi(`/team${qs({ published: onlyPublished ? 'true' : undefined })}`)
}
export async function upsertTeamMember(member) {
  return member.id ? api.put(`/team/${member.id}`, stripId(member)) : api.post('/team', stripId(member))
}
export async function deleteTeamMember(id) { return api.del(`/team/${id}`) }

// ============================================================
// SITE SETTINGS
// ============================================================
export function useSiteSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/settings').then((map) => setSettings(map || {})).catch(() => setSettings({})).finally(() => setLoading(false))
  }, [])
  async function updateSetting(key, value) {
    await api.put(`/settings/${key}`, { value })
    setSettings((prev) => ({ ...prev, [key]: value }))
  }
  return { settings, loading, updateSetting }
}

// ============================================================
// PROFILES (staff)
// ============================================================
export function useProfiles() { return useApi('/profiles') }
export async function updateProfileRole(id, role) { return api.patch(`/profiles/${id}/role`, { role }) }
export async function deactivateProfile(id) { return api.patch(`/profiles/${id}`, { is_active: false }) }
export async function inviteStaff(payload) { return api.post('/auth/register', payload) }

// ============================================================
// ACTIVITY LOG
// ============================================================
export function useActivityLog(limit = 50) { return useApi(`/activity${qs({ limit })}`) }
// Activity is logged server-side on every write, so this is a no-op kept
// for call-site compatibility (prevents duplicate client-side entries).
export async function logActivity() { /* server logs automatically */ }

// ============================================================
// NEWSLETTER
// ============================================================
export function useNewsletter(filters = {}) { return useApi(`/newsletter${qs({ status: filters.status })}`) }
export async function subscribeNewsletter(email, source = 'website') { return api.post('/newsletter', { email, source }) }
export async function updateSubscriberStatus(id, status) { return api.patch(`/newsletter/${id}`, { status }) }

// ============================================================
// TRANSACTIONS
// ============================================================
export function useTransactions(filters = {}) {
  return useApi(`/payments/transactions${qs({ status: filters.status, provider: filters.provider, search: filters.search })}`, { poll: 20000 })
}
export function usePaymentStats() {
  const [stats, setStats] = useState(null)
  useEffect(() => { api.get('/stats/payments').then(setStats).catch(() => setStats(null)) }, [])
  return { stats }
}
