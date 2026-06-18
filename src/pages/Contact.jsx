// src/pages/Contact.jsx
import { useState, useMemo } from 'react'
import { MapPin, Phone, Mail, Clock, Check, Calendar } from 'lucide-react'
import Meta from '@/components/Meta'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import { submitContactForm, bookAppointment, checkSlotAvailability, useSiteSettings } from '@/hooks/useData'
import { CONTACT_FALLBACK } from '@/data/site'

const SERVICES = ['Residential Design', 'Commercial / Hospitality', 'Home Goods / Shop', 'Bulk / Trade Supply', 'General Enquiry']
const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00']
const EMPTY = { name: '', email: '', phone: '', service: '', message: '' }

function nextDays(n = 7) {
  const out = []
  const d = new Date()
  while (out.length < n) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0) out.push(new Date(d)) // skip Sundays
  }
  return out
}

export default function Contact() {
  const { settings } = useSiteSettings()
  const contact = settings.contact_info ?? CONTACT_FALLBACK

  // Contact form state
  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [formErr, setFormErr] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleContact(e) {
    e.preventDefault()
    setFormErr('')
    if (!form.name || !form.email || !form.message) { setFormErr('Please add your name, email, and a message.'); return }
    setSending(true)
    try {
      await submitContactForm({ full_name: form.name, email: form.email, phone: form.phone, service: form.service, message: form.message })
      setSent(true); setForm(EMPTY)
    } catch { setFormErr('Failed to send. Please try again or call us directly.') }
    setSending(false)
  }

  // Booking widget state
  const days = useMemo(() => nextDays(7), [])
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [slotErr, setSlotErr] = useState('')
  const [booking, setBooking] = useState({ name: '', email: '', phone: '', notes: '' })
  const [booked, setBooked] = useState(false)
  const [bookingBusy, setBookingBusy] = useState(false)
  const setB = (k) => (e) => setBooking((b) => ({ ...b, [k]: e.target.value }))

  async function selectSlot(d, t) {
    setSlotErr('')
    const iso = d.toISOString().slice(0, 10)
    const available = await checkSlotAvailability(iso, t)
    if (!available) { setSlotErr('That slot was just taken — please choose another.'); return }
    setDate(iso); setTime(t)
  }

  async function confirmBooking(e) {
    e.preventDefault()
    setSlotErr('')
    if (!date || !time) { setSlotErr('Please pick a date and time.'); return }
    if (!booking.name || !booking.email) { setSlotErr('Please add your name and email.'); return }
    setBookingBusy(true)
    try {
      const stillFree = await checkSlotAvailability(date, time)
      if (!stillFree) { setSlotErr('That slot was just taken — please choose another.'); setBookingBusy(false); return }
      await bookAppointment({
        client_name: booking.name, client_email: booking.email, client_phone: booking.phone,
        type: 'design_consultation', service: form.service || 'Design Consultation',
        preferred_date: date, preferred_time: time, notes: booking.notes,
      })
      setBooked(true)
    } catch { setSlotErr('Booking failed. Please try again or call us.') }
    setBookingBusy(false)
  }

  return (
    <>
      <Meta title="Book a Design Consultation — Maxims Interiors" description="Get in touch or book a design consultation with Maxims Interiors & Home Goods in Abuja." />
      <PageHero eyebrow="Get in Touch" title="Let's Start a Conversation" lead="Whether it's a single room or an entire property, we'd love to hear about your project." />

      <section className="section-base bg-charcoal pt-10">
        <div className="container-lux grid lg:grid-cols-2 gap-12">
          {/* Contact form */}
          <Reveal>
            <h2 className="text-display-md">Send a Message</h2>
            <div className="gold-divider !justify-start" />
            {sent ? (
              <div className="notice-success flex items-center gap-2 mt-4"><Check size={18} /> Thank you! We'll be in touch within 24 hours.</div>
            ) : (
              <form onSubmit={handleContact} className="mt-6 space-y-5">
                {formErr && <div className="notice-error">{formErr}</div>}
                <div className="grid sm:grid-cols-2 gap-5">
                  <input className="lux-input" placeholder="Full name *" value={form.name} onChange={set('name')} />
                  <input type="email" className="lux-input" placeholder="Email *" value={form.email} onChange={set('email')} />
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <input className="lux-input" placeholder="Phone" value={form.phone} onChange={set('phone')} />
                  <select className="lux-input" value={form.service} onChange={set('service')}>
                    <option value="">Service of interest</option>
                    {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <textarea rows={5} className="lux-input resize-none" placeholder="Tell us about your project *" value={form.message} onChange={set('message')} />
                <button type="submit" disabled={sending} className="btn-gold-solid w-full disabled:opacity-60">{sending ? 'Sending…' : 'Send Message'}</button>
              </form>
            )}

            {/* Contact details */}
            <div className="mt-10 space-y-4">
              <Detail icon={MapPin} text={contact.address} />
              <Detail icon={Phone} text={contact.phone} href={`tel:${(contact.phone || '').replace(/\s/g, '')}`} />
              <Detail icon={Mail} text={contact.email} href={`mailto:${contact.email}`} />
              {contact.hours && <Detail icon={Clock} text={contact.hours} />}
            </div>
          </Reveal>

          {/* Booking widget */}
          <Reveal delay={0.12}>
            <div className="card-glass p-7 sm:p-9">
              <div className="flex items-center gap-2 text-gold mb-1"><Calendar size={18} /><span className="eyebrow !text-gold">Book a Consultation</span></div>
              <h2 className="text-display-md">Reserve Your Slot</h2>

              {booked ? (
                <div className="mt-6 text-center py-8">
                  <div className="grid place-items-center w-16 h-16 mx-auto rounded-full bg-gold/15 text-gold mb-5"><Check size={30} /></div>
                  <h3 className="font-editorial text-2xl text-cream-soft">You're booked!</h3>
                  <p className="mt-3 font-body text-cream-soft/60">
                    We've reserved <span className="text-gold">{date}</span> at <span className="text-gold">{time}</span>.
                    A confirmation email is on its way once our team approves it.
                  </p>
                </div>
              ) : (
                <>
                  {/* Date picker */}
                  <p className="font-title text-[0.62rem] tracking-[0.15em] uppercase text-cream-soft/50 mt-6 mb-3">Choose a day</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {days.map((d) => {
                      const iso = d.toISOString().slice(0, 10)
                      const isSel = date === iso
                      return (
                        <button key={iso} onClick={() => { setDate(iso); setTime(null) }}
                          className={`p-2 border text-center transition-colors ${isSel ? 'border-gold bg-gold/10 text-gold' : 'border-cream-soft/15 text-cream-soft/60 hover:border-gold/50'}`}>
                          <div className="font-body text-[0.6rem] uppercase tracking-wide">{d.toLocaleDateString('en-NG', { weekday: 'short' })}</div>
                          <div className="font-display text-lg leading-tight">{d.getDate()}</div>
                          <div className="font-body text-[0.55rem] text-cream-soft/40">{d.toLocaleDateString('en-NG', { month: 'short' })}</div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Time picker */}
                  {date && (
                    <>
                      <p className="font-title text-[0.62rem] tracking-[0.15em] uppercase text-cream-soft/50 mt-6 mb-3">Choose a time</p>
                      <div className="grid grid-cols-4 gap-2">
                        {TIME_SLOTS.map((t) => (
                          <button key={t} onClick={() => selectSlot(days.find(d => d.toISOString().slice(0,10) === date), t)}
                            className={`py-2 border font-body text-sm transition-colors ${time === t ? 'border-gold bg-gold/10 text-gold' : 'border-cream-soft/15 text-cream-soft/60 hover:border-gold/50'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Details */}
                  <form onSubmit={confirmBooking} className="mt-6 space-y-4">
                    {slotErr && <div className="notice-error">{slotErr}</div>}
                    <input className="lux-input" placeholder="Full name *" value={booking.name} onChange={setB('name')} />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <input type="email" className="lux-input" placeholder="Email *" value={booking.email} onChange={setB('email')} />
                      <input className="lux-input" placeholder="Phone" value={booking.phone} onChange={setB('phone')} />
                    </div>
                    <textarea rows={2} className="lux-input resize-none" placeholder="Anything we should know?" value={booking.notes} onChange={setB('notes')} />
                    <button type="submit" disabled={bookingBusy} className="btn-gold-solid w-full disabled:opacity-60">{bookingBusy ? 'Reserving…' : 'Confirm Booking'}</button>
                  </form>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}

function Detail({ icon: Icon, text, href }) {
  const inner = <span className="font-body text-sm text-cream-soft/65">{text}</span>
  return (
    <div className="flex items-center gap-3">
      <span className="grid place-items-center w-9 h-9 border border-gold/25 text-gold/70 shrink-0"><Icon size={15} /></span>
      {href ? <a href={href} className="hover:text-gold transition-colors">{inner}</a> : inner}
    </div>
  )
}
