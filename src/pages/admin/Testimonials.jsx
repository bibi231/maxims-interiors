// src/pages/admin/Testimonials.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Star } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useTestimonials, upsertTestimonial, deleteTestimonial } from '@/hooks/useData'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

function TestimonialModal({ testi, onClose, onSave }) {
    const [formData, setFormData] = useState({
        client_name: testi?.client_name || '',
        client_role: testi?.client_role || '',
        quote: testi?.quote || '',
        rating: testi?.rating || 5,
        is_published: testi?.is_published ?? true,
        is_featured: testi?.is_featured ?? false,
        sort_order: testi?.sort_order || 0,
    })

    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = { ...formData }
            if (testi?.id) payload.id = testi.id
            await onSave(payload)
            onClose()
        } catch (err) {
            console.error(err)
            alert('Error saving testimonial.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}>
            <motion.div className="w-full max-w-[500px] bg-charcoal-mid border border-gold/15"
                initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
                    <h2 className="font-title text-[0.9rem] tracking-[0.15em] text-gold">{testi ? 'Edit Testimonial' : 'New Testimonial'}</h2>
                    <button onClick={onClose} className="text-cream-soft/30 hover:text-gold transition-colors"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Client Name *</label>
                            <input required value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none" />
                        </div>
                        <div>
                            <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Role / Location *</label>
                            <input required value={formData.client_role} onChange={e => setFormData({ ...formData, client_role: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none" placeholder="e.g. Homeowner · Lekki" />
                        </div>
                    </div>

                    <div>
                        <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Quote *</label>
                        <textarea required rows="4" value={formData.quote} onChange={e => setFormData({ ...formData, quote: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none resize-none" />
                    </div>

                    <div className="flex items-center gap-4 py-2">
                        <div>
                            <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Rating</label>
                            <select value={formData.rating} onChange={e => setFormData({ ...formData, rating: parseInt(e.target.value) })} className="bg-charcoal border border-gold/10 px-3 py-1 font-body text-sm text-cream-soft focus:border-gold/40 outline-none">
                                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                            </select>
                        </div>
                        <div className="flex-1"></div>
                        <div>
                            <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Sort</label>
                            <input type="number" value={formData.sort_order} onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} className="w-16 bg-charcoal border border-gold/10 px-2 py-1 font-body text-sm text-cream-soft text-center focus:border-gold/40 outline-none" />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-6 pt-2 pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.is_published} onChange={e => setFormData({ ...formData, is_published: e.target.checked })} className="accent-gold" />
                            <span className="font-title text-[0.6rem] tracking-wider text-cream-soft/70 uppercase">Published</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.is_featured} onChange={e => setFormData({ ...formData, is_featured: e.target.checked })} className="accent-gold" />
                            <span className="font-title text-[0.6rem] tracking-wider text-cream-soft/70 uppercase">Featured (Home)</span>
                        </label>
                    </div>

                    <button type="submit" disabled={saving}
                        className="w-full bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest font-title text-[0.65rem] tracking-[0.18em] uppercase py-3 hover:shadow-gold transition-all mt-4 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Testimonial'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    )
}

export default function Testimonials() {
    const [selected, setSelected] = useState(null)
    const [isAdding, setIsAdding] = useState(false)
    const { canWrite } = useAuth()

    const { data: testimonials, loading, refresh } = useTestimonials()

    const handleSave = async (payload) => {
        await upsertTestimonial(payload)
        refresh()
    }

    const handleDelete = async (e, id) => {
        e.stopPropagation()
        if (window.confirm('Are you sure you want to delete this testimonial?')) {
            await deleteTestimonial(id)
            refresh()
        }
    }

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-title text-xl text-cream-soft tracking-wide">Testimonials</h1>
                    <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">{testimonials.length} reviews</p>
                </div>
                {canWrite('testimonials') && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-gold/10 text-gold border border-gold/20 px-4 py-2 font-title text-[0.6rem] tracking-widest uppercase hover:bg-gold/20 transition-all">
                        <Plus size={14} /> New Review
                    </button>
                )}
            </div>

            <div className="bg-charcoal border border-gold/8 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-gold/8">
                                {['Client', 'Quote excerpt', 'Rating', 'Visibility', ''].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-left font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft/22">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="border-b border-gold/5 animate-pulse">
                                        {Array(5).fill(0).map((_, j) => (
                                            <td key={j} className="px-5 py-4"><div className="h-4 bg-cream-soft/5 rounded w-20" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : testimonials.length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-12 text-center font-body text-[0.8rem] text-cream-soft/20">No testimonials found</td></tr>
                            ) : (
                                testimonials.map(t => (
                                    <tr key={t.id} className="border-b border-gold/5 hover:bg-gold/3 transition-colors cursor-pointer" onClick={() => setSelected(t)}>
                                        <td className="px-5 py-4">
                                            <div className="font-title text-[0.7rem] text-gold/75">{t.client_name}</div>
                                            <div className="font-body text-[0.65rem] text-cream-soft/40 mt-0.5">{t.client_role}</div>
                                        </td>
                                        <td className="px-5 py-4 font-body text-[0.75rem] text-cream-soft/70 max-w-xs truncate">
                                            "{t.quote}"
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex gap-0.5">
                                                {Array(5).fill(0).map((_, i) => (
                                                    <Star key={i} size={10} fill={i < t.rating ? '#C9A84C' : 'none'} color={i < t.rating ? '#C9A84C' : '#4d4b52'} />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex gap-2">
                                                {t.is_published && <span className="px-2 py-0.5 bg-green-400/10 border border-green-400/20 text-green-400 font-title text-[0.5rem] tracking-wider uppercase">Live</span>}
                                                {t.is_featured && <span className="px-2 py-0.5 bg-gold/10 border border-gold/20 text-gold font-title text-[0.5rem] tracking-wider uppercase">Featured</span>}
                                                {!t.is_published && !t.is_featured && <span className="px-2 py-0.5 border border-cream-soft/10 text-cream-soft/30 font-title text-[0.5rem] tracking-wider uppercase">Draft</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-3">
                                                {canWrite('testimonials') && (
                                                    <button className="text-cream-soft/20 hover:text-red-400 transition-colors" onClick={(e) => handleDelete(e, t.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {(selected || isAdding) && (
                    <TestimonialModal
                        testi={selected}
                        onClose={() => { setSelected(null); setIsAdding(false) }}
                        onSave={handleSave}
                        canWrite={canWrite('testimonials')}
                    />
                )}
            </AnimatePresence>
        </AdminLayout>
    )
}
