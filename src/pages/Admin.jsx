import { useState } from 'react'
import { LayoutDashboard, ShoppingCart, Settings, Users, LogOut, Package, Plus, Search, MoreVertical } from 'lucide-react'
import { Link } from 'react-router-dom'

const STATS = [
    { label: 'Total Revenue', val: '₦4.2M', trend: '+12%' },
    { label: 'Active Projects', val: '18', trend: '+2' },
    { label: 'Pending Orders', val: '45', trend: '-8' },
    { label: 'Client Inquiries', val: '12', trend: '+5' },
]

export default function Admin() {
    const [tab, setTab] = useState('dashboard')

    return (
        <div className="flex min-h-screen bg-[#F8F9FA] font-body">
            {/* Sidebar */}
            <aside className="w-[280px] bg-charcoal-mid border-r border-gold/10 flex flex-col pt-8">
                <div className="px-8 mb-12">
                    <div className="font-title text-sm tracking-[0.3em] text-gold font-bold">MAXIMS</div>
                    <div className="font-body text-[0.5rem] tracking-[0.2em] uppercase text-gold/40 mt-1">Admin Portal</div>
                </div>
                <nav className="flex-1 px-4 space-y-1">
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { id: 'projects', icon: Plus, label: 'Projects' },
                        { id: 'shop', icon: ShoppingCart, label: 'Shop Inventory' },
                        { id: 'users', icon: Users, label: 'Inquiries' },
                        { id: 'bulk', icon: Package, label: 'Bulk Requests' },
                    ].map(m => (
                        <button key={m.id} onClick={() => setTab(m.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 font-title text-[0.65rem] tracking-[0.15em] uppercase transition-all
                ${tab === m.id ? 'bg-gold text-purple-darkest dark:text-cream-soft' : 'text-cream-soft hover:bg-gold/8 hover:text-gold'}`}>
                            <m.icon size={16} /> {m.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-gold/10">
                    <button className="w-full flex items-center gap-3 px-4 py-3 font-title text-[0.65rem] tracking-[0.15em] uppercase text-red-400 hover:bg-red-400/5 transition-all">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col">
                {/* Topbar */}
                <header className="h-16 bg-card border-b border-purple-rich/5 flex items-center justify-between px-8">
                    <div className="flex items-center gap-3 bg-cream-soft rounded-full px-4 py-1.5 border border-purple-rich/5">
                        <Search size={14} className="text-charcoal-muted" />
                        <input type="text" placeholder="Search anything..." className="bg-transparent outline-none text-[0.78rem] font-body text-charcoal w-64" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-xs">M</div>
                        <span className="font-title text-[0.62rem] tracking-[0.1em] uppercase text-charcoal font-bold">Christine Namicit Gadzama</span>
                    </div>
                </header>

                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="font-title text-xl tracking-[0.12em] uppercase text-purple-rich dark:text-gold-light font-bold">Admin Dashboard</h1>
                        <div className="flex gap-2">
                            <button className="bg-card border border-purple-rich/10 px-4 py-2 font-title text-[0.58rem] tracking-[0.15em] uppercase text-charcoal-muted hover:border-gold transition-all">Export Report</button>
                            <button className="bg-purple-rich text-gold px-4 py-2 font-title text-[0.58rem] tracking-[0.15em] uppercase hover:bg-purple-dark transition-all">+ New Entry</button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {STATS.map(s => (
                            <div key={s.label} className="bg-card p-6 border border-purple-rich/5 shadow-sm">
                                <p className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-charcoal-muted mb-1">{s.label}</p>
                                <div className="flex items-end justify-between">
                                    <span className="font-editorial text-2xl text-purple-rich dark:text-gold-light">{s.val}</span>
                                    <span className={`font-body text-[0.6rem] font-bold ${s.trend.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>{s.trend}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-card border border-purple-rich/5 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-purple-rich/5 flex items-center justify-between">
                            <h3 className="font-title text-[0.65rem] tracking-[0.2em] uppercase text-purple-rich dark:text-gold-light font-bold">Recent Projects</h3>
                            <button className="text-charcoal-muted hover:text-gold"><MoreVertical size={16} /></button>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-[#FAF7F2] border-b border-purple-rich/5">
                                <tr>
                                    {['Project Name', 'Client', 'Status', 'Date', 'Action'].map(h => (
                                        <th key={h} className="px-6 py-3 font-title text-[0.52rem] tracking-[0.25em] uppercase text-gold/60">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="font-body text-[0.8rem] text-charcoal-muted">
                                {[
                                    { name: 'The Laurent Residence', client: 'Adaeze Nwosu', status: 'In Progress', date: '24 Feb 2024' },
                                    { name: 'Casa Elegante', client: 'Dr. Adeyemi', status: 'Completed', date: '18 Jan 2024' },
                                    { name: 'Meridian Hotel', client: 'Chief Okafor', status: 'Review', date: '12 Dec 2023' },
                                    { name: 'Pinnacle Penthouse', client: 'Unknown', status: 'On Hold', date: '05 Nov 2023' },
                                ].map(r => (
                                    <tr key={r.name} className="border-b border-purple-rich/5 last:border-0 hover:bg-cream-soft/20 transition-colors">
                                        <td className="px-6 py-4 font-bold text-charcoal">{r.name}</td>
                                        <td className="px-6 py-4">{r.client}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest
                        ${r.status === 'Completed' ? 'bg-green-100 text-green-700' : r.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs">{r.date}</td>
                                        <td className="px-6 py-4"><button className="text-gold hover:underline">Edit</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}
