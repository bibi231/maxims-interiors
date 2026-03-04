import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Package, Users, Truck, Database } from 'lucide-react'
import { submitBulkRequest } from '@/hooks/useData'

const SERVE = [
    { icon: '🏨', label: 'Hotels' },
    { icon: '🏢', label: 'Offices' },
    { icon: '🏗️', label: 'Developers' },
    { icon: '🎨', label: 'Designers' },
    { icon: '📅', label: 'Event Planners' },
    { icon: '🏥', label: 'Healthcare' },
]

const BENEFITS = [
    { icon: Package, title: 'Volume Discounts', desc: 'Progressive pricing tiers for large-scale procurement and recurring orders.' },
    { icon: Users, title: 'Account Manager', desc: 'Dedicated point of contact to handle logistics, quotes, and custom requests.' },
    { icon: Truck, title: 'Fast Delivery', desc: 'White-glove delivery across Nigeria with priority scheduling for trade partners.' },
    { icon: Database, title: 'Custom Sourcing', desc: 'Access to bespoke manufacturing and non-catalog pieces for unique projects.' },
]

const FAQS = [
    { q: 'What qualifies as a bulk order?', a: 'Typically, orders of 10+ identical items or total project values over ₦2.5 Million qualify for our trade program.' },
    { q: 'Do you ship nationwide?', a: 'Yes, we have a specialized logistics network that delivers to all 36 states in Nigeria.' },
    { q: 'Can you manufacture custom designs?', a: 'Absolutely. We work with local and international artisans to create pieces to your exact specifications.' },
    { q: 'What is the typical lead time?', a: 'Stock items ship in 3-7 days. Custom or large-scale procurement typically ranges from 4-12 weeks.' },
]

export default function BulkOrders() {
    const [reqData, setReqData] = useState({ name: '', company: '', email: '', phone: '', requirements: '' })
    const [reqStatus, setReqStatus] = useState('idle')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setReqStatus('submitting')
        try {
            await submitBulkRequest(reqData)
            setReqStatus('success')
            setReqData({ name: '', company: '', email: '', phone: '', requirements: '' })
            setTimeout(() => setReqStatus('idle'), 3000)
        } catch (err) {
            console.error(err)
            setReqStatus('error')
        }
    }

    return (
        <div>
            <section className="page-hero min-h-[380px]">
                <div className="page-hero-overlay" /><div className="page-hero-pattern" />
                <motion.div className="relative z-10 px-6 py-24 text-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
                    <p className="eyebrow mb-4" style={{ color: 'rgba(201,168,76,0.65)' }}>Commercial Program</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-4">Bulk & Trade Orders</h1>
                    <div className="flex items-center justify-center gap-4 my-3">
                        <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, #C9A84C)' }} /><span className="text-gold text-xs">✦</span>
                        <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, #C9A84C)' }} />
                    </div>
                    <p className="font-body text-cream-soft/45 text-sm mt-2">Bespoke procurement and volume pricing for developers & professionals</p>
                </motion.div>
            </section>

            {/* Who We Serve */}
            <section className="section-base bg-cream">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">Partnerships</p>
                    <h2 className="text-display-md text-purple-rich font-display">Who We Serve</h2>
                    <div className="gold-divider" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-[1200px] mx-auto">
                    {SERVE.map(s => (
                        <div key={s.label} className="bg-white border border-purple-rich/5 p-6 text-center hover:border-gold transition-all group">
                            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{s.icon}</div>
                            <h3 className="font-title text-[0.62rem] tracking-[0.2em] uppercase text-purple-rich">{s.label}</h3>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it Works */}
            <section className="section-base bg-charcoal-mid">
                <div className="section-header-center">
                    <p className="eyebrow mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>Simple Workflow</p>
                    <h2 className="text-display-md text-gold-light font-display">How It Works</h2>
                    <div className="gold-divider" />
                </div>
                <div className="max-w-[1000px] mx-auto flex flex-col md:flex-row gap-8 text-center relative">
                    <div className="absolute top-8 left-0 right-0 h-px border-t border-dashed border-gold/20 hidden md:block" />
                    {[
                        { n: '01', t: 'Submit Request', d: 'Fill out our trade form with project details and product interests.' },
                        { n: '02', t: 'Custom Quote', d: 'Your account manager will provide a tailored quote with volume discounts.' },
                        { n: '03', t: 'Receive & Install', d: 'Coordinated delivery and optional professional installation at your site.' },
                    ].map((s, i) => (
                        <div key={s.n} className="flex-1 relative z-10">
                            <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold text-gold font-title text-xl flex items-center justify-center mx-auto mb-6">{s.n}</div>
                            <h4 className="font-title text-[0.75rem] tracking-[0.2em] uppercase text-cream-soft mb-3">{s.t}</h4>
                            <p className="font-body text-[0.82rem] text-cream-soft/40 leading-relaxed">{s.d}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Benefits */}
            <section className="section-base bg-cream-soft">
                <div className="section-header-center">
                    <p className="eyebrow mb-3">Trade Values</p>
                    <h2 className="text-display-md text-purple-rich font-display">Trade Benefits</h2>
                    <div className="gold-divider" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1100px] mx-auto">
                    {BENEFITS.map((b, i) => (
                        <div key={b.title} className="card-luxury p-10 text-center relative group overflow-hidden">
                            <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <b.icon size={28} className="text-gold mx-auto mb-5 relative z-10" />
                            <h3 className="font-title text-[0.7rem] tracking-[0.2em] uppercase text-purple-rich mb-3 relative z-10">{b.title}</h3>
                            <p className="font-body text-[0.8rem] text-charcoal-muted leading-relaxed relative z-10">{b.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Form */}
            <section className="section-base bg-cream">
                <div className="max-w-[800px] mx-auto bg-white border border-purple-rich/5 p-12 lg:p-16">
                    <div className="text-center mb-12">
                        <p className="eyebrow mb-3">Get Started</p>
                        <h2 className="text-display-md text-purple-rich font-display">Submit a Bulk Request</h2>
                        <div className="gold-divider" />
                    </div>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-2">
                            <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold">Full Name</label>
                            <input type="text" required value={reqData.name} onChange={e => setReqData({ ...reqData, name: e.target.value })} className="w-full bg-cream-soft/30 border border-purple-rich/10 px-4 py-3 font-body text-sm focus:border-gold outline-none transition-colors disabled:opacity-50" disabled={reqStatus === 'submitting'} placeholder="John Doe" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold">Company Name</label>
                            <input type="text" value={reqData.company} onChange={e => setReqData({ ...reqData, company: e.target.value })} className="w-full bg-cream-soft/30 border border-purple-rich/10 px-4 py-3 font-body text-sm focus:border-gold outline-none transition-colors disabled:opacity-50" disabled={reqStatus === 'submitting'} placeholder="Luxe Properties Ltd" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold">Email Address</label>
                            <input type="email" required value={reqData.email} onChange={e => setReqData({ ...reqData, email: e.target.value })} className="w-full bg-cream-soft/30 border border-purple-rich/10 px-4 py-3 font-body text-sm focus:border-gold outline-none transition-colors disabled:opacity-50" disabled={reqStatus === 'submitting'} placeholder="john@company.com" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold">Phone Number</label>
                            <input type="tel" value={reqData.phone} onChange={e => setReqData({ ...reqData, phone: e.target.value })} className="w-full bg-cream-soft/30 border border-purple-rich/10 px-4 py-3 font-body text-sm focus:border-gold outline-none transition-colors disabled:opacity-50" disabled={reqStatus === 'submitting'} placeholder="+234 ..." />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold">Project Requirements</label>
                            <textarea required rows="4" value={reqData.requirements} onChange={e => setReqData({ ...reqData, requirements: e.target.value })} className="w-full bg-cream-soft/30 border border-purple-rich/10 px-4 py-3 font-body text-sm focus:border-gold outline-none transition-colors resize-none disabled:opacity-50" disabled={reqStatus === 'submitting'} placeholder="Tell us about your project and product needs..." />
                        </div>
                        <button type="submit" disabled={reqStatus === 'submitting'} className="md:col-span-2 btn-maxims btn-gold-solid w-full justify-center mt-4">
                            {reqStatus === 'submitting' ? 'Sending...' : reqStatus === 'success' ? '✓ Inquiry Sent' : 'Send Inquiry'}
                        </button>
                    </form>
                </div>
            </section>

            {/* FAQ */}
            <section className="section-base bg-cream-soft">
                <div className="max-w-[800px] mx-auto">
                    <div className="section-header-center">
                        <p className="eyebrow mb-3">Questions</p>
                        <h2 className="text-display-md text-purple-rich font-display">Common Inquiries</h2>
                        <div className="gold-divider" />
                    </div>
                    <div className="space-y-4">
                        {FAQS.map(q => (
                            <div key={q.q} className="border-b border-purple-rich/10 pb-6 group cursor-pointer">
                                <h4 className="font-title text-[0.75rem] tracking-[0.1em] text-purple-rich mb-3 group-hover:text-gold transition-colors">{q.q}</h4>
                                <p className="font-body text-[0.82rem] text-charcoal-muted leading-relaxed">{q.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}
