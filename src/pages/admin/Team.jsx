// src/pages/admin/Team.jsx
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, UploadCloud, User as UserIcon } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useTeamMembers, upsertTeamMember } from '@/hooks/useData'
import { uploadFile, getStorageUrl, BUCKETS } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

function TeamModal({ member, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: member?.name || '',
        role: member?.role || '',
        bio: member?.bio || '',
        email: member?.email || '',
        linkedin_url: member?.linkedin_url || '',
        is_published: member?.is_published ?? true,
        sort_order: member?.sort_order || 0,
    })

    const [imageFile, setImageFile] = useState(null)
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef(null)

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0])
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            let avatar_url = member?.avatar_url
            if (imageFile) {
                avatar_url = await uploadFile(BUCKETS.team, imageFile, 'avatars')
            }

            const payload = {
                ...formData,
                avatar_url,
            }
            if (member?.id) payload.id = member.id

            await onSave(payload)
            onClose()
        } catch (err) {
            console.error(err)
            alert('Error saving team member.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}>
            <motion.div className="w-full max-w-[580px] bg-charcoal-mid border border-gold/15 max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10 sticky top-0 bg-charcoal-mid z-10">
                    <h2 className="font-title text-[0.9rem] tracking-[0.15em] text-gold">{member ? 'Edit Member' : 'New Member'}</h2>
                    <button onClick={onClose} className="text-cream-soft hover:text-gold transition-colors"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Avatar Upload */}
                    <div className="flex items-center gap-6">
                        <div
                            className="w-24 h-24 rounded-full border-2 border-dashed border-gold/20 bg-charcoal flex items-center justify-center cursor-pointer hover:border-gold/50 transition-colors group relative overflow-hidden flex-shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imageFile ? (
                                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                            ) : member?.avatar_url ? (
                                <img src={getStorageUrl(BUCKETS.team, member.avatar_url)} alt="Avatar" className="absolute inset-0 w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                            ) : (
                                <UserIcon size={32} className="text-gold/40 group-hover:scale-110 transition-transform duration-300" />
                            )}
                            <div className="absolute inset-0 bg-charcoal/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <UploadCloud size={18} className="text-white mx-auto mb-1" />
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />

                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Full Name *</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none" placeholder="Jane Doe" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Role / Job Title *</label>
                            <input required value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none" placeholder="Senior Designer" />
                        </div>
                        <div>
                            <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Email Address</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none" placeholder="jane@maxims.com" />
                        </div>
                    </div>

                    <div>
                        <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Bio (Short paragraph)</label>
                        <textarea rows="3" value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none resize-none" />
                    </div>

                    <div>
                        <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">LinkedIn URL</label>
                        <input type="url" value={formData.linkedin_url} onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none" placeholder="https://linkedin.com/in/..." />
                    </div>

                    <div className="flex flex-wrap gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.is_published} onChange={e => setFormData({ ...formData, is_published: e.target.checked })} className="accent-gold" />
                            <span className="font-title text-[0.6rem] tracking-wider text-cream-soft uppercase">Published on Website</span>
                        </label>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="font-title text-[0.6rem] tracking-wider text-cream-soft uppercase">Sort Order</span>
                            <input type="number" value={formData.sort_order} onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} className="w-16 bg-charcoal border border-gold/10 px-2 py-1 font-body text-sm text-cream-soft text-center focus:border-gold/40 outline-none" />
                        </div>
                    </div>

                    <button type="submit" disabled={saving}
                        className="w-full bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest dark:text-cream-soft font-title text-[0.65rem] tracking-[0.18em] uppercase py-3 hover:shadow-gold transition-all mt-4 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Member'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    )
}

export default function Team() {
    const [selected, setSelected] = useState(null)
    const [isAdding, setIsAdding] = useState(false)
    const { canWrite } = useAuth()

    const { data: team, loading, refresh } = useTeamMembers(false)

    const handleSave = async (payload) => {
        await upsertTeamMember(payload)
        refresh()
    }

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-title text-xl text-cream-soft tracking-wide">Team</h1>
                    <p className="font-body text-[0.75rem] text-cream-soft mt-0.5">{team.length} members</p>
                </div>
                {canWrite('team') && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-gold/10 text-gold border border-gold/20 px-4 py-2 font-title text-[0.6rem] tracking-widest uppercase hover:bg-gold/20 transition-all">
                        <Plus size={14} /> Add Member
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="bg-charcoal border border-gold/8 p-6 animate-pulse">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-cream-soft/5" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-cream-soft/5 rounded w-3/4" />
                                    <div className="h-3 bg-cream-soft/5 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="h-2 bg-cream-soft/5 rounded w-full mb-2" />
                            <div className="h-2 bg-cream-soft/5 rounded w-4/5" />
                        </div>
                    ))
                ) : team.map(t => (
                    <div key={t.id} className="bg-charcoal border border-gold/8 p-6 relative group">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!t.is_published && <span className="px-2 py-0.5 border border-cream-soft/10 text-cream-soft font-title text-[0.5rem] tracking-wider uppercase">Draft</span>}
                        </div>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-gold/5 border border-gold/10 overflow-hidden mb-4">
                                {t.avatar_url ? (
                                    <img src={getStorageUrl(BUCKETS.team, t.avatar_url)} alt={t.name} className="w-full h-full object-cover grayscale opacity-80" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <UserIcon size={24} className="text-gold/40" />
                                    </div>
                                )}
                            </div>

                            <h3 className="font-title text-[0.9rem] text-gold/90 mb-1">{t.name}</h3>
                            <p className="font-title text-[0.6rem] tracking-[0.15em] uppercase text-cream-soft mb-4">{t.role}</p>

                            <p className="font-body text-[0.75rem] text-cream-soft line-clamp-3 mb-6">
                                {t.bio || 'No bio provided.'}
                            </p>

                            {canWrite('team') && (
                                <button onClick={() => setSelected(t)} className="w-full py-2 border border-gold/20 text-gold hover:bg-gold/10 font-title text-[0.6rem] tracking-widest uppercase transition-all">
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {(selected || isAdding) && (
                    <TeamModal
                        member={selected}
                        onClose={() => { setSelected(null); setIsAdding(false) }}
                        onSave={handleSave}
                    />
                )}
            </AnimatePresence>
        </AdminLayout>
    )
}
