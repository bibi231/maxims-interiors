import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Phone, Mail, Clock, Calendar, Instagram, Facebook, Linkedin, MessageCircle } from 'lucide-react'
import Meta from '@/components/Meta'
import { submitContactForm, bookAppointment, checkSlotAvailability, useContactInfo, usePricing } from '@/hooks/useData'
import { mapsUrl, telHref, waHref } from '@/lib/siteDefaults'
import { formatNaira } from '@/lib/utils'

const SERVICES = ['Full Room Design', 'Design Package', 'Bulk & Trade Order', 'Home Staging', 'Shop / Product Enquiry', 'Other']
const TIMES = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM']
const fieldLabel = 'font-title text-[0.8rem] font-bold tracking-[0.16em] uppercase text-gold-deep dark:text-gold'
const fieldCls = 'min-h-[48px] bg-cream-soft/40 border border-purple-rich/20 px-4 py-3 font-body text-base text-charcoal focus:border-gold outline-none disabled:opacity-50'

export default function Contact() {
    const { contact: ci, social } = useContactInfo()
    const { pricing } = usePricing()
    const fee = Number(pricing.consultation?.fee) || 0
    const bookingRef = useRef(null)
    const [msgData, setMsgData] = useState({ full_name: '', email: '', phone: '', service: SERVICES[0], message: '' })
    const [msgStatus, setMsgStatus] = useState('idle')
    const [msgError, setMsgError] = useState('')
    const [msgRef, setMsgRef] = useState('')

    const handleMsgSubmit = async (e) => {
        e.preventDefault()
        setMsgStatus('submitting'); setMsgError('')
        try {
            const r = await submitContactForm(msgData)
            setMsgRef(r?.reference || '')
            setMsgStatus('success')
            setMsgData({ full_name: '', email: '', phone: '', service: SERVICES[0], message: '' })
        } catch (err) {
            setMsgError(err.message || 'Could not send your message. Please call or email us.')
            setMsgStatus('error')
        }
    }

    const [apptDate, setApptDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d.toISOString().split('T')[0]
    })
    const [apptTime, setApptTime] = useState(TIMES[0])
    const [avail, setAvail] = useState(true)
    const [apptStatus, setApptStatus] = useState('idle')
    const [apptName, setApptName] = useState('')
    const [apptEmail, setApptEmail] = useState('')
    const [apptPhone, setApptPhone] = useState('')

    useEffect(() => {
        checkSlotAvailability(apptDate, apptTime).then(setAvail).catch(() => setAvail(true))
    }, [apptDate, apptTime])

    const handleApptSubmit = async (e) => {
        e.preventDefault()
        if (!avail) return
        setApptStatus('submitting')
        try {
            await bookAppointment({
                client_name: apptName, client_email: apptEmail, client_phone: apptPhone || undefined,
                preferred_date: apptDate, preferred_time: apptTime, service: pricing.consultation?.title || 'Consultation',
            })
            setApptStatus('success')
            setApptName(''); setApptEmail(''); setApptPhone('')
        } catch (err) {
            console.error(err)
            setApptStatus('error')
        }
    }

    const METHODS = [
        { icon: Calendar, title: 'Book a Consultation', desc: `${pricing.consultation?.duration ? pricing.consultation.duration + ' ' : ''}one-on-one with our lead designer. ${fee > 0 ? `Fee: ${formatNaira(fee)}.` : 'Complimentary.'}`, cta: 'Book Now', onClick: () => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
        ci.whatsapp || ci.phone
            ? { icon: ci.whatsapp ? MessageCircle : Phone, title: ci.whatsapp ? 'Call or WhatsApp' : 'Call Us', desc: 'Quick questions and project updates.', cta: ci.whatsapp ? 'WhatsApp Us' : 'Call Now', href: ci.whatsapp ? waHref(ci.whatsapp) : telHref(ci.phone) }
            : { icon: Mail, title: 'Email Us', desc: 'We reply within one working day.', cta: 'Send Email', href: `mailto:${ci.email}` },
        { icon: MapPin, title: 'Visit Our Showroom', desc: ci.address, cta: 'Get Directions', href: mapsUrl(ci), external: true },
    ]
    const SOCIAL = [[Instagram, social.instagram, 'Instagram'], [Facebook, social.facebook, 'Facebook'], [Linkedin, social.linkedin, 'LinkedIn']].filter(([, u]) => u)

    return (
        <div>
            <Meta title="Contact — Maxims Interiors" description={`Visit our showroom at ${ci.address}, book a design consultation, or send us a message.`} />
            <section className="page-hero min-h-[360px] sm:min-h-[420px]">
                <div className="page-hero-overlay" /><div className="page-hero-pattern" />
                <motion.div className="relative z-10 px-5 py-20 sm:py-24 text-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
                    <p className="eyebrow mb-4">Get In Touch</p>
                    <h1 className="text-display-lg text-cream-soft font-display mb-4">Let&apos;s Create<br /><em className="text-gold-light italic">Something Beautiful</em></h1>
                    <div className="gold-divider" />
                </motion.div>
            </section>

            <section className="section-base bg-cream-soft">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1000px] mx-auto mb-14 sm:mb-20">
                    {METHODS.map(m => (
                        <div key={m.title} className="card-luxury p-7 sm:p-9 text-center flex flex-col">
                            <m.icon size={28} className="text-gold mx-auto mb-5" />
                            <h3 className="font-title text-[0.95rem] font-bold tracking-[0.16em] uppercase text-purple-rich dark:text-gold-light mb-3">{m.title}</h3>
                            <p className="font-body text-[0.95rem] text-charcoal-muted leading-relaxed mb-6 flex-1">{m.desc}</p>
                            {m.href
                                ? <a href={m.href} {...(m.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="btn-maxims btn-outline-gold justify-center self-center">{m.cta}</a>
                                : <button type="button" onClick={m.onClick} className="btn-maxims btn-outline-gold justify-center self-center">{m.cta}</button>}
                        </div>
                    ))}
                </div>

                <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] bg-card border border-purple-rich/10 overflow-hidden">
                    {/* Message form */}
                    <div className="p-5 sm:p-10 lg:p-14">
                        <h2 className="text-display-md text-purple-rich dark:text-gold-light font-display mb-6 sm:mb-8">Send a Message</h2>
                        {msgStatus === 'success' ? (
                            <div className="border-l-4 border-gold bg-gold/10 p-5">
                                <p className="font-body text-base text-charcoal font-semibold">Thank you. Your message has been sent.</p>
                                {msgRef && <p className="font-body text-[0.95rem] text-charcoal-muted mt-1">Reference: <strong>{msgRef}</strong>. We reply within one working day.</p>}
                                <button type="button" onClick={() => setMsgStatus('idle')} className="btn-maxims btn-outline-gold mt-4">Send another</button>
                            </div>
                        ) : (
                            <form className="grid grid-cols-1 sm:grid-cols-2 gap-5" onSubmit={handleMsgSubmit}>
                                <div className="sm:col-span-2 flex flex-col gap-2">
                                    <label htmlFor="c-name" className={fieldLabel}>Full Name</label>
                                    <input id="c-name" type="text" autoComplete="name" required value={msgData.full_name} onChange={e => setMsgData({ ...msgData, full_name: e.target.value })} className={fieldCls} disabled={msgStatus === 'submitting'} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="c-email" className={fieldLabel}>Email</label>
                                    <input id="c-email" type="email" autoComplete="email" required value={msgData.email} onChange={e => setMsgData({ ...msgData, email: e.target.value })} className={fieldCls} disabled={msgStatus === 'submitting'} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="c-phone" className={fieldLabel}>Phone</label>
                                    <input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" value={msgData.phone} onChange={e => setMsgData({ ...msgData, phone: e.target.value })} className={fieldCls} disabled={msgStatus === 'submitting'} />
                                </div>
                                <div className="sm:col-span-2 flex flex-col gap-2">
                                    <label htmlFor="c-service" className={fieldLabel}>Service Interest</label>
                                    <select id="c-service" value={msgData.service} onChange={e => setMsgData({ ...msgData, service: e.target.value })} className={`${fieldCls} cursor-pointer`} disabled={msgStatus === 'submitting'}>
                                        {SERVICES.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="sm:col-span-2 flex flex-col gap-2">
                                    <label htmlFor="c-msg" className={fieldLabel}>Message</label>
                                    <textarea id="c-msg" required rows="5" value={msgData.message} onChange={e => setMsgData({ ...msgData, message: e.target.value })} className={`${fieldCls} resize-y`} disabled={msgStatus === 'submitting'} />
                                </div>
                                {msgStatus === 'error' && <p className="sm:col-span-2 font-body text-[0.95rem] text-red-700 dark:text-red-400">{msgError}</p>}
                                <button type="submit" disabled={msgStatus === 'submitting'} className="sm:col-span-2 btn-maxims btn-gold-solid w-full justify-center mt-2">
                                    {msgStatus === 'submitting' ? 'Sending...' : 'Submit Inquiry'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Booking + showroom */}
                    <div className="bg-charcoal flex flex-col">
                        <div ref={bookingRef} className="flex-1 p-5 sm:p-10 lg:p-14 border-b border-gold/15 scroll-mt-24">
                            <p className="eyebrow mb-4">Schedule</p>
                            <h3 className="font-editorial text-2xl sm:text-3xl text-cream-soft mb-2">Book a Consultation</h3>
                            <p className="font-body text-[0.95rem] text-cream-soft/85 mb-6">
                                {pricing.consultation?.description} {fee > 0 ? <strong className="text-gold-light">Fee: {formatNaira(fee)}.</strong> : <strong className="text-gold-light">Complimentary.</strong>}
                            </p>
                            {apptStatus === 'success' ? (
                                <div className="border-l-4 border-gold bg-gold/10 p-4">
                                    <p className="font-body text-base text-cream-soft">Request received. We will confirm your time by email.</p>
                                    <button type="button" onClick={() => setApptStatus('idle')} className="btn-maxims btn-outline-gold mt-4">Book another</button>
                                </div>
                            ) : (
                                <form onSubmit={handleApptSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input type="text" required placeholder="Your name" aria-label="Your name" autoComplete="name" value={apptName} onChange={e => setApptName(e.target.value)} className="min-h-[48px] w-full bg-transparent border-b border-gold/40 px-2 py-2 text-base text-cream-soft focus:border-gold outline-none placeholder:text-cream-soft/60" disabled={apptStatus === 'submitting'} />
                                        <input type="email" required placeholder="Email" aria-label="Email" autoComplete="email" value={apptEmail} onChange={e => setApptEmail(e.target.value)} className="min-h-[48px] w-full bg-transparent border-b border-gold/40 px-2 py-2 text-base text-cream-soft focus:border-gold outline-none placeholder:text-cream-soft/60" disabled={apptStatus === 'submitting'} />
                                        <input type="tel" placeholder="Phone (optional)" aria-label="Phone" autoComplete="tel" value={apptPhone} onChange={e => setApptPhone(e.target.value)} className="sm:col-span-2 min-h-[48px] w-full bg-transparent border-b border-gold/40 px-2 py-2 text-base text-cream-soft focus:border-gold outline-none placeholder:text-cream-soft/60" disabled={apptStatus === 'submitting'} />
                                    </div>
                                    <input type="date" required aria-label="Preferred date" value={apptDate} onChange={e => setApptDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="min-h-[48px] w-full bg-transparent border-b border-gold/40 px-2 py-2 text-base text-cream-soft focus:border-gold outline-none" disabled={apptStatus === 'submitting'} />
                                    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Preferred time">
                                        {TIMES.map(t => (
                                            <button type="button" role="radio" aria-checked={t === apptTime} key={t} onClick={() => setApptTime(t)} className={`min-h-[48px] border text-[0.95rem] font-title font-semibold transition-all ${t === apptTime ? 'border-gold text-gold bg-gold/10' : 'border-gold/35 text-cream-soft/85 hover:border-gold hover:text-gold'}`} disabled={apptStatus === 'submitting'}>{t}</button>
                                        ))}
                                    </div>
                                    {!avail && <p className="text-red-400 text-[0.9rem]">This slot is taken. Please pick another time.</p>}
                                    {apptStatus === 'error' && <p className="text-red-400 text-[0.9rem]">Could not book. Please try another time or call us.</p>}
                                    <button type="submit" disabled={!avail || apptStatus === 'submitting'} className="btn-maxims btn-gold-solid w-full justify-center disabled:opacity-50">
                                        {apptStatus === 'submitting' ? 'Booking...' : 'Request Booking'}
                                    </button>
                                </form>
                            )}
                        </div>
                        <div className="p-5 sm:p-10 lg:p-14 bg-purple-darkest">
                            <p className="eyebrow mb-5">Our Showroom</p>
                            <address className="not-italic space-y-4 mb-8">
                                <a href={mapsUrl(ci)} target="_blank" rel="noopener noreferrer" className="flex gap-4 items-start group">
                                    <MapPin className="text-gold shrink-0 mt-1" size={18} />
                                    <span className="font-body text-base text-cream-soft leading-relaxed group-hover:text-gold">{ci.address}<span className="block text-[0.95rem] text-gold/90 underline underline-offset-4 mt-1">Open in Google Maps</span></span>
                                </a>
                                {ci.phone && (
                                    <a href={telHref(ci.phone)} className="flex gap-4 items-center min-h-[44px] hover:text-gold">
                                        <Phone className="text-gold shrink-0" size={18} />
                                        <span className="font-body text-base text-cream-soft">{ci.phone}</span>
                                    </a>
                                )}
                                <div className="flex gap-4 items-start">
                                    <Mail className="text-gold shrink-0 mt-1" size={18} />
                                    <div className="space-y-2 min-w-0">
                                        {[['General', ci.email || 'info@maximsinterior.com.ng'], ['Support', 'support@maximsinterior.com.ng'], ['Owner', 'christinegadzama@maximsinterior.com.ng']].map(([label, addr]) => (
                                            <a key={label} href={`mailto:${addr}`} className="block font-body text-base text-cream-soft break-all hover:text-gold">
                                                <span className="text-gold font-title text-[0.8rem] font-bold tracking-wider uppercase block">{label}</span>{addr}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                                {ci.hours && (
                                    <div className="flex gap-4 items-center">
                                        <Clock className="text-gold shrink-0" size={18} />
                                        <p className="font-body text-base text-cream-soft">{ci.hours}</p>
                                    </div>
                                )}
                            </address>
                            {SOCIAL.length > 0 && (
                                <div className="flex gap-3">
                                    {SOCIAL.map(([Icon, url, label]) => (
                                        <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-11 h-11 border border-gold/35 flex items-center justify-center text-gold/80 hover:text-gold hover:border-gold transition-all"><Icon size={17} /></a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
