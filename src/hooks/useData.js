// src/hooks/useData.js
// ============================================================
// Central data hooks for all Supabase tables
// Each hook returns: { data, loading, error } + CRUD functions
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ── Generic fetch hook ───────────────────────────────────────
function useTable(table, query, deps = []) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: rows, error: err } = await query()
    if (err) setError(err.message)
    else setData(rows ?? [])
    setLoading(false)
  }, deps)

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}

// ── Generic realtime hook ────────────────────────────────────
function useRealtimeTable(table, query, deps = []) {
  const result = useTable(table, query, deps)

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        result.refresh()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [table])

  return result
}

// ============================================================
// DASHBOARD STATS
// ============================================================
export function useDashboardStats() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [orders, bulk, appts, messages, products] = await Promise.all([
        supabase.from('orders').select('id, status, total, created_at'),
        supabase.from('bulk_requests').select('id, status, created_at'),
        supabase.from('appointments').select('id, status, created_at'),
        supabase.from('contact_messages').select('id, status, created_at'),
        supabase.from('products').select('id, status, stock_qty'),
      ])

      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const ordersData    = orders.data    ?? []
      const bulkData      = bulk.data      ?? []
      const apptsData     = appts.data     ?? []
      const messagesData  = messages.data  ?? []
      const productsData  = products.data  ?? []

      setStats({
        orders: {
          total:       ordersData.length,
          thisMonth:   ordersData.filter(o => new Date(o.created_at) >= thisMonth).length,
          pending:     ordersData.filter(o => o.status === 'pending').length,
          revenue:     ordersData.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0),
        },
        bulk: {
          total:       bulkData.length,
          new:         bulkData.filter(b => b.status === 'new').length,
          thisMonth:   bulkData.filter(b => new Date(b.created_at) >= thisMonth).length,
        },
        appointments: {
          total:       apptsData.length,
          pending:     apptsData.filter(a => a.status === 'pending').length,
          today:       apptsData.filter(a => new Date(a.preferred_date).toDateString() === now.toDateString()).length,
        },
        messages: {
          total:       messagesData.length,
          unread:      messagesData.filter(m => m.status === 'unread').length,
        },
        products: {
          total:       productsData.length,
          active:      productsData.filter(p => p.status === 'active').length,
          lowStock:    productsData.filter(p => p.stock_qty <= 3 && p.status === 'active').length,
        },
      })
      setLoading(false)
    }
    load()
  }, [])

  return { stats, loading }
}

// ============================================================
// PRODUCTS
// ============================================================
export function useProducts(filters = {}) {
  return useTable('products', () => {
    let q = supabase.from('products').select('*').order('sort_order').order('created_at', { ascending: false })
    if (filters.status)   q = q.eq('status', filters.status)
    if (filters.category) q = q.eq('category', filters.category)
    if (filters.featured) q = q.eq('is_featured', true)
    return q
  }, [JSON.stringify(filters)])
}

export async function upsertProduct(product) {
  const { data, error } = await supabase.from('products')
    .upsert(product, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function updateProductStatus(id, status) {
  const { error } = await supabase.from('products').update({ status }).eq('id', id)
  if (error) throw error
}

// ============================================================
// ORDERS
// ============================================================
export function useOrders(filters = {}) {
  return useRealtimeTable('orders', () => {
    let q = supabase.from('orders')
      .select('*, assigned_profile:assigned_to(full_name, avatar_url)')
      .order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.search) q = q.ilike('customer_name', `%${filters.search}%`)
    return q
  }, [JSON.stringify(filters)])
}

export async function updateOrderStatus(id, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

export async function assignOrder(orderId, profileId) {
  const { error } = await supabase.from('orders').update({ assigned_to: profileId }).eq('id', orderId)
  if (error) throw error
}

// Public: place a new order from the storefront
export async function placeOrder(orderData) {
  const { data, error } = await supabase.from('orders').insert(orderData).select().single()
  if (error) throw error
  return data
}

// ============================================================
// BULK REQUESTS
// ============================================================
export function useBulkRequests(filters = {}) {
  return useRealtimeTable('bulk_requests', () => {
    let q = supabase.from('bulk_requests')
      .select('*, assigned_profile:assigned_to(full_name)')
      .order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    return q
  }, [JSON.stringify(filters)])
}

export async function updateBulkStatus(id, status, notes = '') {
  const { error } = await supabase.from('bulk_requests')
    .update({ status, internal_notes: notes, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function submitBulkRequest(formData) {
  const { data, error } = await supabase.from('bulk_requests').insert(formData).select().single()
  if (error) throw error
  return data
}

// ============================================================
// APPOINTMENTS
// ============================================================
export function useAppointments(filters = {}) {
  return useRealtimeTable('appointments', () => {
    let q = supabase.from('appointments')
      .select('*, assigned_profile:assigned_to(full_name, avatar_url)')
      .order('preferred_date').order('preferred_time')
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.date)   q = q.eq('preferred_date', filters.date)
    if (filters.type)   q = q.eq('type', filters.type)
    return q
  }, [JSON.stringify(filters)])
}

export async function updateAppointmentStatus(id, status) {
  const updates = { status }
  if (status === 'confirmed') updates.confirmed_at = new Date().toISOString()
  const { error } = await supabase.from('appointments').update(updates).eq('id', id)
  if (error) throw error
}

export async function bookAppointment(formData) {
  const { data, error } = await supabase.from('appointments').insert(formData).select().single()
  if (error) throw error
  return data
}

// Check if a time slot is available
export async function checkSlotAvailability(date, time) {
  const { data } = await supabase.from('appointments')
    .select('id').eq('preferred_date', date).eq('preferred_time', time)
    .not('status', 'in', '("cancelled","rescheduled")')
  return (data?.length ?? 0) === 0
}

// ============================================================
// CONTACT MESSAGES
// ============================================================
export function useContactMessages(filters = {}) {
  return useRealtimeTable('contact_messages', () => {
    let q = supabase.from('contact_messages')
      .select('*, replied_profile:replied_by(full_name)')
      .order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    return q
  }, [JSON.stringify(filters)])
}

export async function markMessageRead(id) {
  const { error } = await supabase.from('contact_messages')
    .update({ status: 'read' }).eq('id', id)
  if (error) throw error
}

export async function replyToMessage(id, replyText, profileId) {
  const { error } = await supabase.from('contact_messages').update({
    status: 'replied',
    reply_text: replyText,
    replied_by: profileId,
    replied_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw error
}

export async function submitContactForm(formData) {
  const { data, error } = await supabase.from('contact_messages').insert(formData).select().single()
  if (error) throw error
  return data
}

// ============================================================
// GALLERY
// ============================================================
export function useGallery(filters = {}) {
  return useTable('gallery_projects', () => {
    let q = supabase.from('gallery_projects').select('*').order('sort_order').order('created_at', { ascending: false })
    if (filters.published !== undefined) q = q.eq('is_published', filters.published)
    if (filters.category)                q = q.eq('category', filters.category)
    if (filters.featured)                q = q.eq('is_featured', true)
    return q
  }, [JSON.stringify(filters)])
}

export async function upsertGalleryProject(project) {
  const { data, error } = await supabase.from('gallery_projects')
    .upsert(project, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data
}

export async function deleteGalleryProject(id) {
  const { error } = await supabase.from('gallery_projects').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// TESTIMONIALS
// ============================================================
export function useTestimonials(filters = {}) {
  return useTable('testimonials', () => {
    let q = supabase.from('testimonials').select('*').order('sort_order').order('created_at', { ascending: false })
    if (filters.published !== undefined) q = q.eq('is_published', filters.published)
    if (filters.featured)                q = q.eq('is_featured', true)
    return q
  }, [JSON.stringify(filters)])
}

export async function upsertTestimonial(testi) {
  const { data, error } = await supabase.from('testimonials')
    .upsert(testi, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data
}

export async function deleteTestimonial(id) {
  const { error } = await supabase.from('testimonials').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// TEAM MEMBERS
// ============================================================
export function useTeamMembers(onlyPublished = false) {
  return useTable('team_members', () => {
    let q = supabase.from('team_members').select('*').order('sort_order')
    if (onlyPublished) q = q.eq('is_published', true)
    return q
  }, [onlyPublished])
}

export async function upsertTeamMember(member) {
  const { data, error } = await supabase.from('team_members')
    .upsert(member, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data
}

// ============================================================
// SITE SETTINGS
// ============================================================
export function useSiteSettings() {
  const [settings, setSettings] = useState({})
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.from('site_settings').select('*').then(({ data }) => {
      const map = {}
      data?.forEach(row => {
        try { map[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value }
        catch { map[row.key] = row.value }
      })
      setSettings(map)
      setLoading(false)
    })
  }, [])

  async function updateSetting(key, value) {
    const { error } = await supabase.from('site_settings')
      .update({ value: JSON.stringify(value), updated_at: new Date().toISOString() })
      .eq('key', key)
    if (error) throw error
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return { settings, loading, updateSetting }
}

// ============================================================
// TEAM PROFILES (admin user management)
// ============================================================
export function useProfiles() {
  return useTable('profiles', () =>
    supabase.from('profiles').select('*').order('created_at')
  , [])
}

export async function updateProfileRole(id, role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  if (error) throw error
}

export async function deactivateProfile(id) {
  const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id)
  if (error) throw error
}

// ============================================================
// ACTIVITY LOG
// ============================================================
export function useActivityLog(limit = 50) {
  return useTable('activity_log', () =>
    supabase.from('activity_log')
      .select('*, profile:user_id(full_name, role, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(limit)
  , [limit])
}

export async function logActivity({ userId, action, resourceType, resourceId, description, oldValue, newValue }) {
  await supabase.from('activity_log').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    description,
    old_value: oldValue ? JSON.stringify(oldValue) : null,
    new_value: newValue ? JSON.stringify(newValue) : null,
  })
}
