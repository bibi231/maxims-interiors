// src/pages/admin/Gallery.jsx
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, X, Image as ImageIcon, UploadCloud, Check } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useGallery, upsertGalleryProject, deleteGalleryProject } from '@/hooks/useData'
import { uploadFile, getStorageUrl, BUCKETS } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

function ProjectModal({ project, onClose, onSave }) {
    const [formData, setFormData] = useState({
        title: project?.title || '',
        category: project?.category || 'Residential',
        client_name: project?.client_name || '',
        location: project?.location || '',
        completion_year: project?.completion_year || new Date().getFullYear(),
        description: project?.description || '',
        is_published: project?.is_published ?? true,
        is_featured: project?.is_featured ?? false,
        sort_order: project?.sort_order || 0,
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
            let image_url = project?.image_url
            if (imageFile) {
                image_url = await uploadFile(BUCKETS.gallery, imageFile, 'covers')
            }

            const payload = {
                ...formData,
                image_url,
            }
            if (project?.id) payload.id = project.id

            await onSave(payload)
            onClose()
        } catch (err) {
            console.error(err)
            alert('Error saving project.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <motion.div className="fixed inset-0 z-[300] bg-charcoal/85 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}>
            <motion.div className="w-full max-w-[640px] bg-charcoal-mid border border-gold/15 max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10 sticky top-0 bg-charcoal-mid z-10">
                    <h2 className="font-title text-[0.9rem] tracking-[0.15em] text-gold">{project ? 'Edit Project' : 'New Project'}</h2>
                    <button onClick={onClose} className="text-cream-soft hover:text-gold transition-colors"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Image Upload */}
                    <div>
                        <div className="font-title text-[0.55rem] tracking-[0.25em] uppercase text-gold/50 mb-3">Cover Image</div>
                        <div
                            className="border-2 border-dashed border-gold/20 bg-charcoal p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gold/50 transition-colors group aspect-video relative overflow-hidden"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imageFile ? (
                                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                            ) : project?.image_url ? (
                                <img src={getStorageUrl(BUCKETS.gallery, project.image_url)} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                            ) : (
                                <div className="text-center group-hover:scale-105 transition-transform duration-300">
                                    <UploadCloud size={24} className="text-gold/40 mx-auto mb-2" />
                                    <span className="font-body text-[0.7rem] text-cream-soft group-hover:text-gold transition-colors">Click to upload cover image</span>
                                </div>
                            )}
                            {(imageFile || project?.image_url) && (
                                <div className="absolute inset-0 bg-charcoal/50 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <UploadCloud size={24} className="text-white mx-auto mb-2" />
                                    <span className="font-body text-[0.7rem] text-white">Change Image</span>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Project Title *</label>
                            <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none" />
                        </div>
                        <div>
                            <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Category *</label>
                            <select required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none">
                                <option value="Residential">Residential</option>
                                <option value="Commercial">Commercial</option>
                                <option value="Hospitality">Hospitality</option>
                                <option value="Concept">Concept</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Client</label>
                            <input value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none" />
                        </div>
                        <div>
                            <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Location</label>
                            <input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold/60 mb-1.5">Description</label>
                        <textarea rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-charcoal border border-gold/10 px-3 py-2 font-body text-sm text-cream-soft focus:border-gold/40 outline-none resize-none" />
                    </div>

                    <div className="flex flex-wrap gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.is_published} onChange={e => setFormData({ ...formData, is_published: e.target.checked })} className="accent-gold" />
                            <span className="font-title text-[0.6rem] tracking-wider text-cream-soft uppercase">Published</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.is_featured} onChange={e => setFormData({ ...formData, is_featured: e.target.checked })} className="accent-gold" />
                            <span className="font-title text-[0.6rem] tracking-wider text-cream-soft uppercase">Featured (Home)</span>
                        </label>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="font-title text-[0.6rem] tracking-wider text-cream-soft uppercase">Sort Order</span>
                            <input type="number" value={formData.sort_order} onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} className="w-16 bg-charcoal border border-gold/10 px-2 py-1 font-body text-sm text-cream-soft text-center focus:border-gold/40 outline-none" />
                        </div>
                    </div>

                    <button type="submit" disabled={saving}
                        className="w-full bg-gradient-to-r from-gold-deep via-gold to-gold-bright text-purple-darkest dark:text-cream-soft font-title text-[0.65rem] tracking-[0.18em] uppercase py-3 hover:shadow-gold transition-all mt-4 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Project'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    )
}

export default function Gallery() {
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(null)
    const [isAdding, setIsAdding] = useState(false)
    const { canWrite } = useAuth()

    const { data: projects, loading, refresh } = useGallery()

    const filtered = projects.filter(p =>
        !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
    )

    const handleSave = async (payload) => {
        await upsertGalleryProject(payload)
        refresh()
    }

    const handleDelete = async (e, id) => {
        e.stopPropagation()
        if (window.confirm('Are you sure you want to delete this project?')) {
            await deleteGalleryProject(id)
            refresh()
        }
    }

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-title text-xl text-cream-soft tracking-wide">Gallery Projects</h1>
                    <p className="font-body text-[0.75rem] text-cream-soft mt-0.5">{projects.length} total projects</p>
                </div>
                {canWrite('gallery') && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-gold/10 text-gold border border-gold/20 px-4 py-2 font-title text-[0.6rem] tracking-widest uppercase hover:bg-gold/20 transition-all">
                        <Plus size={14} /> New Project
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-soft" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
                        className="bg-charcoal border border-gold/10 pl-8 pr-4 py-2 font-body text-[0.8rem] text-cream-soft placeholder:text-cream-soft focus:outline-none focus:border-gold/35 w-64 transition-colors" />
                </div>
            </div>

            <div className="bg-charcoal border border-gold/8 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-gold/8">
                                {['Project', 'Location', 'Client', 'Visibility', 'Order', ''].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-left font-title text-[0.52rem] tracking-[0.2em] uppercase text-cream-soft">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="border-b border-gold/5 animate-pulse">
                                        {Array(6).fill(0).map((_, j) => (
                                            <td key={j} className="px-5 py-4"><div className="h-4 bg-cream-soft/5 rounded w-20" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-5 py-12 text-center font-body text-[0.8rem] text-cream-soft">No projects found</td></tr>
                            ) : (
                                filtered.map(p => (
                                    <tr key={p.id} className="border-b border-gold/5 hover:bg-gold/3 transition-colors cursor-pointer" onClick={() => setSelected(p)}>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gold/5 border border-gold/10 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                    {p.image_url ?
                                                        <img src={getStorageUrl(BUCKETS.gallery, p.image_url)} alt={p.title} className="w-full h-full object-cover grayscale opacity-70" />
                                                        : <ImageIcon size={14} className="text-gold/40" />}
                                                </div>
                                                <div>
                                                    <div className="font-title text-[0.7rem] text-gold/75">{p.title}</div>
                                                    <div className="font-body text-[0.65rem] text-cream-soft mt-0.5">{p.category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 font-body text-[0.75rem] text-cream-soft">
                                            {p.location || '-'}
                                        </td>
                                        <td className="px-5 py-3 font-body text-[0.75rem] text-cream-soft">
                                            {p.client_name || '-'}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex gap-2">
                                                {p.is_published && <span className="px-2 py-0.5 bg-green-400/10 border border-green-400/20 text-green-400 font-title text-[0.5rem] tracking-wider uppercase">Live</span>}
                                                {p.is_featured && <span className="px-2 py-0.5 bg-gold/10 border border-gold/20 text-gold font-title text-[0.5rem] tracking-wider uppercase">Featured</span>}
                                                {!p.is_published && !p.is_featured && <span className="px-2 py-0.5 border border-cream-soft/10 text-cream-soft font-title text-[0.5rem] tracking-wider uppercase">Draft</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 font-title text-[0.7rem] text-cream-soft">
                                            {p.sort_order}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-3">
                                                {canWrite('gallery') && (
                                                    <button className="text-cream-soft hover:text-red-400 transition-colors" onClick={(e) => handleDelete(e, p.id)}>
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
                    <ProjectModal
                        project={selected}
                        onClose={() => { setSelected(null); setIsAdding(false) }}
                        onSave={handleSave}
                        canWrite={canWrite('gallery')}
                    />
                )}
            </AnimatePresence>
        </AdminLayout>
    )
}
