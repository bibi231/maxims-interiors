// src/pages/admin/Activity.jsx
import { useState } from 'react'
import { Activity as ActivityIcon, User as UserIcon } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useActivityLog } from '@/hooks/useData'
import { getStorageUrl, BUCKETS } from '@/lib/supabase'

export default function Activity() {
    const [limit, setLimit] = useState(50)
    const { data: logs, loading } = useActivityLog(limit)

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-title text-xl text-cream-soft tracking-wide">Activity Log</h1>
                    <p className="font-body text-[0.75rem] text-cream-soft/30 mt-0.5">System audit trail & user actions</p>
                </div>
            </div>

            <div className="bg-charcoal border border-gold/8 overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-6">
                        {Array(5).fill(0).map((_, i) => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-cream-soft/5 flex-shrink-0" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <div className="h-3 bg-cream-soft/5 rounded w-1/3" />
                                    <div className="h-2 bg-cream-soft/5 rounded w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <ActivityIcon size={32} className="text-cream-soft/10 mx-auto mb-4" />
                        <p className="font-body text-[0.85rem] text-cream-soft/30">No activity recorded yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gold/5">
                        {logs.map(log => (
                            <div key={log.id} className="p-5 flex items-start gap-4 hover:bg-gold/3 transition-colors">
                                <div className="w-9 h-9 rounded-full bg-gold/5 border border-gold/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {log.profile?.avatar_url ? (
                                        <img src={getStorageUrl(BUCKETS.avatars, log.profile.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon size={14} className="text-gold/40" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-body text-[0.82rem] text-cream-soft/80 leading-relaxed">
                                        <span className="font-medium text-cream-soft mr-1">{log.profile?.full_name || 'System'}</span>
                                        <span className="text-cream-soft/50">{log.description || `${log.action} on ${log.resource_type}`}</span>
                                    </p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="font-title text-[0.6rem] tracking-wider uppercase text-gold/40">
                                            {new Date(log.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </span>
                                        <span className="font-body text-[0.65rem] text-cream-soft/20 uppercase tracking-widest px-1.5 border border-cream-soft/5">
                                            {log.action}
                                        </span>
                                        <span className="font-body text-[0.65rem] text-cream-soft/20 uppercase tracking-widest px-1.5 border border-cream-soft/5">
                                            {log.resource_type}
                                        </span>
                                    </div>

                                    {(log.old_value || log.new_value) && (
                                        <div className="mt-3 bg-black/20 rounded p-3 font-mono text-[0.65rem] text-cream-soft/40 overflow-x-auto">
                                            {log.old_value && <div className="text-red-400/50 mb-1">- {log.old_value}</div>}
                                            {log.new_value && <div className="text-green-400/50">+ {log.new_value}</div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && logs.length >= limit && (
                    <div className="p-4 border-t border-gold/5 text-center bg-gold/3">
                        <button onClick={() => setLimit(l => l + 50)} className="font-title text-[0.65rem] tracking-widest uppercase text-gold hover:text-gold-bright transition-colors">
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
