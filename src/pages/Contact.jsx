import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Phone, Mail, Clock, Calendar, Instagram, Facebook, Linkedin } from 'lucide-react'
import { submitContactForm, bookAppointment, checkSlotAvailability } from '@/hooks/useData'

const METHODS = [
    { icon: Calendar, title: 'Book Consultation', desc: 'Schedule a 1-on-1 session with our lead designers.', cta: 'Book Now' },
    { icon: Phone, title: 'Call or WhatsApp', desc: 'Available for quick questions and project updates.', cta: 'Contact' },
    { icon: MapPin, title: 'Visit Showroom', desc: 'Experience our collection in person at our Abuja flagship.', cta: 'Get Directions' },
]

export default function Contact() {
    const [msgData, setMsgData] = useState({ name: '', email: '', phone: '', service: 'Full Room Design', message: '' })
    const [msgStatus, setMsgStatus] = useState('idle')

    const handleMsgSubmit = async (e) => {
        e.preventDefault()
        setMsgStatus('submitting')
        try {
            await submitContactForm(msgData)
            setMsgStatus('success')
            setMsgData({ name: '', email: '', phone: '', service: 'Full Room Design', message: '' })
            setTimeout(() => setMsgStatus('idle'), 3000)
        } catch (err) {
            console.error(err)
            setMsgStatus('error')
        }
    }

    const [apptDate, setApptDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d.toISOString().split('T')[0]
    })
    const TIMES = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM']
    const [apptTime, setApptTime] = useState(TIMES[0])
    const [avail, setAvail] = useState(true)
    const [apptStatus, setApptStatus] = useState('idle')
    const [apptName, setApptName] = useState('')
    const [apptEmail, setApptEmail] = useState('')

    useEffect(() => {
        checkSlotAvailability(apptDate, apptTime).then(setAvail)
    }, [apptDate, apptTime])

    const handleApptSubmit = async (e) => {
        e.preventDefault()
        if (!avail) return
        setApptStatus('submitting')
        try {
            await bookAppointment({
                client_name: apptName,
                client_email: apptEmail,
                preferred_date: apptDate,
                preferred_time: apptTime,
                service_type: 'Consultation'
            })
            setApptStatus('success')
            setTimeout(() => setApptStatus('idle'), 3000)
            setApptName('')
            setApptEmail('')
        } catch (err) {
            console.error(err)
            setApptStatus('error')
        }
    }

    return (
        <div>
            <section className="page-hero min-h-[420px]">
                <div className="page-hero-overlay" /><div className="page-hero-pattern" />
                <motion.div className="relative z-10 px-6 py-24 text-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
                    <p className="eyebrow mb-4" style={{ color: 'rgba(201,168,76,0.65)' }}>Get In Touch</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-4">Let's Create<br /><em className="text-gold-light italic">Something Beautiful</em></h1>
                    <div className="gold-divider" />
                </motion.div>
            </section>

            <section className="section-base bg-cream-soft">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[1000px] mx-auto mb-20">
                    {METHODS.map(m => (
                        <motion.div key={m.title} className="card-luxury p-10 text-center group" whileHover={{ y: -5 }}>
                            <m.icon size={28} className="text-gold mx-auto mb-6" />
                            <h3 className="font-title text-[0.75rem] tracking-[0.2em] uppercase text-purple-rich mb-3">{m.title}</h3>
                            <p className="font-body text-xs text-charcoal-muted/50 leading-relaxed mb-6">{m.desc}</p>
                            <button className="btn-maxims btn-outline-gold text-[0.55rem] px-5 py-2.5">{m.cta}</button>
                        </motion.div>
                    ))}
                </div>

                <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 bg-white border border-purple-rich/5 overflow-hidden">
                    {/* Form */}
                    <div className="p-12 lg:p-16">
                        <h2 className="text-display-md text-purple-rich font-display mb-8">Send a Message</h2>
                        <form className="grid grid-cols-1 sm:grid-cols-2 gap-6" onSubmit={handleMsgSubmit}>
                            <div className="sm:col-span-2 flex flex-col gap-2">
                                <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold">Full Name</label>
                                <input type="text" required value={msgData.name} onChange={e => setMsgData({ ...msgData, name: e.target.value })} className="bg-cream-soft/30 border border-purple-rich/10 px-4 py-3 font-body text-sm focus:border-gold outline-none disabled:opacity-50" disabled={msgStatus === 'submitting'} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold">Email</label>
                                <input type="email" required value={msgData.email} onChange={e => setMsgData({ ...msgData, email: e.target.value })} className="bg-cream-soft/30 border border-purple-rich/10 px-4 py-3 font-body text-sm focus:border-gold outline-none disabled:opacity-50" disabled={msgStatus === 'submitting'} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold">Phone</label>
                                <input type="tel" value={msgData.phone} onChange={e => setMsgData({ ...msgData, phone: e.target.value })} className="bg-cream-soft/30 border border-purple-rich/10 px-4 py-3 font-body text-sm focus:border-gold outline-none disabled:opacity-50" disabled={msgStatus === 'submitting'} />
                            </div>
                            <div className="sm:col-span-2 flex flex-col gap-2">
                                <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold">Service Interest</label>
                                <select value={msgData.service} onChange={e => setMsgData({ ...msgData, service: e.target.value })} className="bg-cream-soft/30 border border-purple-rich/10 px-4 py-3 font-body text-sm focus:border-gold outline-none cursor-pointer disabled:opacity-50" disabled={msgStatus === 'submitting'}>
                                    <option>Full Room Design</option>
                                    <option>Bulk & Trade Order</option>
                                    <option>Home Staging</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2 flex flex-col gap-2">
                                <label className="font-title text-[0.55rem] tracking-[0.2em] uppercase text-gold">Message</label>
                                <textarea required rows="4" value={msgData.message} onChange={e => setMsgData({ ...msgData, message: e.target.value })} className="bg-cream-soft/30 border border-purple-rich/10 px-4 py-3 font-body text-sm focus:border-gold outline-none resize-none disabled:opacity-50" disabled={msgStatus === 'submitting'} />
                            </div>
                            <button type="submit" disabled={msgStatus === 'submitting'} className="sm:col-span-2 btn-maxims btn-gold-solid w-full justify-center mt-4">
                                {msgStatus === 'submitting' ? 'Sending...' : msgStatus === 'success' ? '✓ Sent Successfully' : 'Submit Inquiry'}
                            </button>
                        </form>
                    </div>

                    {/* Info Panel */}
                    <div className="bg-charcoal flex flex-col">
                        <div className="flex-1 p-12 lg:p-16 border-b border-gold/10">
                            <p className="eyebrow mb-6">Schedule</p>
                            <h3 className="font-editorial text-2xl text-cream-soft mb-8">Book a Meeting</h3>
                            <form onSubmit={handleApptSubmit}>
                                <div className="mb-6 flex gap-3">
                                    <input type="text" required placeholder="Name" value={apptName} onChange={e => setApptName(e.target.value)} className="w-1/2 bg-transparent border-b border-gold/30 px-2 py-2 text-sm text-cream-soft focus:border-gold outline-none placeholder:text-cream-soft/30" disabled={apptStatus === 'submitting'} />
                                    <input type="email" required placeholder="Email" value={apptEmail} onChange={e => setApptEmail(e.target.value)} className="w-1/2 bg-transparent border-b border-gold/30 px-2 py-2 text-sm text-cream-soft focus:border-gold outline-none placeholder:text-cream-soft/30" disabled={apptStatus === 'submitting'} />
                                </div>
                                <div className="mb-8">
                                    <input type="date" required value={apptDate} onChange={e => setApptDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full bg-transparent border-b border-gold/30 px-2 py-2 text-sm text-cream-soft focus:border-gold outline-none placeholder:text-cream-soft/30" disabled={apptStatus === 'submitting'} />
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-10">
                                    {TIMES.map(t => (
                                        <button type="button" key={t} onClick={() => setApptTime(t)} className={`border py-2.5 text-[0.7rem] font-title transition-all ${t === apptTime ? 'border-gold text-gold bg-gold/5' : 'border-gold/20 text-gold/60 hover:border-gold hover:text-gold hover:bg-gold/5'}`} disabled={apptStatus === 'submitting'}>{t}</button>
                                    ))}
                                </div>
                                {!avail && <p className="text-red-400 text-xs mb-4 -mt-6">This slot is not available. Please pick another time.</p>}
                                <button type="submit" disabled={!avail || apptStatus === 'submitting'} className="btn-maxims btn-gold-solid w-full justify-center disabled:opacity-50">
                                    {apptStatus === 'submitting' ? 'Booking...' : apptStatus === 'success' ? '✓ Booked Successfully' : 'Confirm Booking'}
                                </button>
                            </form>
                        </div>
                        <div className="p-12 lg:p-16 bg-purple-darkest">
                            <p className="eyebrow mb-6 text-gold/40">Our Showroom</p>
                            <div className="space-y-4 mb-10">
                                <div className="flex gap-4 items-start">
                                    <MapPin className="text-gold shrink-0 mt-1" size={16} />
                                    <p className="font-body text-sm text-cream-soft/50 leading-relaxed">123 Design Boulevard, Wuse 2, Abuja, FCT, Nigeria</p>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <Phone className="text-gold shrink-0" size={16} />
                                    <p className="font-body text-sm text-cream-soft/50">+234 800 000 0000</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {[Instagram, Facebook, Linkedin].map((Icon, i) => (
                                    <a key={i} href="#" className="w-10 h-10 border border-gold/15 flex items-center justify-center text-gold/40 hover:text-gold hover:border-gold transition-all"><Icon size={16} /></a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
