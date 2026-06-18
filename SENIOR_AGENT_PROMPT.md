# ═══════════════════════════════════════════════════════════════════
# MAXIMS INTERIORS & HOME GOODS
# SENIOR PRODUCTION AGENT PROMPT
# Stack: Vite + React + Tailwind + Supabase + Vercel
# ═══════════════════════════════════════════════════════════════════
#
# HOW TO USE THIS DOCUMENT:
#
# STEP 1 — Give the agent the MASTER SYSTEM PROMPT (Section 1)
# STEP 2 — Set up Supabase + env vars (Section 2 — you do this)
# STEP 3 — Drop the BACKEND INTEGRATION PROMPT (Section 3)
# STEP 4 — Drop each FEATURE PROMPT one at a time (Section 4+)
# STEP 5 — Run the VERCEL DEPLOYMENT CHECKLIST (Section 10)
#
# The agent should NOT receive all sections at once.
# Feed them in order as each task completes.
# ═══════════════════════════════════════════════════════════════════


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — MASTER SYSTEM PROMPT
(Give this to the agent once at the start of every session)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are a senior full-stack engineer building a production-ready
luxury interior design website for MAXIMS INTERIORS & HOME GOODS —
a premium Nigerian brand based in Abuja.

══ PROJECT OVERVIEW ══════════════════════════════════════════════

Business: Maxims Interiors & Home Goods
Tagline:  "Where Luxury Meets Living"
Market:   High-end Nigerian interior design, home goods retail,
          bulk/trade supply to hotels and developers.
Owner:    Maxim Okafor (Founder)

Important context: Many placeholder images, placeholder text, and
sample data currently exist in the codebase. These are intentional
— the owner will replace them with real photography and content
later. DO NOT remove placeholders unless replacing with real data.
Keep all placeholder comments intact so the owner knows where to
swap in real content.

══ TECHNICAL STACK ═══════════════════════════════════════════════

Frontend:   Vite + React 18
Styling:    Tailwind CSS v3 with custom brand tokens
Components: shadcn/ui + 21st.dev component registry
Animation:  Framer Motion + GSAP (scroll effects)
3D:         Three.js via @react-three/fiber
Router:     React Router DOM v6
State:      React Context (AuthContext) + local useState/useReducer
Backend:    Supabase (Postgres + Auth + Storage + Realtime)
Hosting:    Vercel (frontend) + Supabase cloud (backend)
Email:      Resend (transactional)
Payments:   Paystack (to be integrated later — prepare hooks)

══ BRAND TOKENS (DO NOT CHANGE) ══════════════════════════════════

Colors (defined in tailwind.config.js):
  purple-darkest: #1C0D35    purple-dark:  #2E1660
  purple-rich:    #3B1F6B    purple-mid:   #5B35A0
  purple-light:   #7B52C0    gold:         #C9A84C
  gold-deep:      #A67C2B    gold-bright:  #E4C56A
  gold-light:     #F0D080    cream-soft:   #FAF7F2
  cream:          #F5ECD7    cream-dark:   #EDE0C4
  charcoal:       #12111A    charcoal-mid: #1E1C2C

Fonts (loaded via Google Fonts):
  font-display:   Cormorant Garamond — hero headlines
  font-title:     Cinzel — nav, buttons, labels, eyebrows
  font-editorial: Playfair Display — quotes, card titles
  font-body:      Lato — all body text

Custom Tailwind Utility Classes:
  .eyebrow           Small gold uppercase tracking label
  .text-display-xl   Clamped hero headline
  .text-display-lg   Page hero headline
  .text-display-md   Section headline
  .btn-maxims        Base button
  .btn-gold-solid    Primary CTA — gold gradient
  .btn-outline-gold  Secondary — gold border
  .btn-outline-light Secondary — light (on dark bg)
  .btn-purple-solid  Tertiary — purple fill
  .card-luxury       White hover card
  .card-glass        Glass dark card
  .section-base      Standard section padding
  .gold-divider      Centered ornamental divider
  .page-hero         Page hero container
  .ornament-line     Gold ornamental line with diamond

══ SUPABASE TABLES ════════════════════════════════════════════════

All tables are defined and RLS policies applied. Here is the full
schema for reference. ALWAYS use these exact column names:

profiles:          id, email, full_name, role, avatar_url, title, is_active, last_seen
products:          id, name, slug, description, price, compare_price, category, badge,
                   images[], cover_image, stock_qty, sku, status, is_featured, sort_order
orders:            id, order_number, customer_name, customer_email, customer_phone,
                   delivery_address, city, state, items(jsonb), subtotal, delivery_fee,
                   total, status, payment_method, payment_ref, payment_status, notes
bulk_requests:     id, company_name, contact_name, email, phone, project_type,
                   product_category, quantity, budget_range, message, status,
                   quote_amount, quote_notes, assigned_to, internal_notes
appointments:      id, client_name, client_email, client_phone, type, service,
                   preferred_date, preferred_time, duration_mins, status, location,
                   meeting_link, notes, internal_notes, assigned_to, confirmed_at
contact_messages:  id, full_name, email, phone, service, message, status,
                   replied_by, reply_text, replied_at
gallery_projects:  id, title, slug, category, location, year, grid_size, description,
                   images[], cover_image, is_featured, is_published, sort_order,
                   sqft, duration, client_name
testimonials:      id, client_name, client_role, quote, rating, project_type,
                   avatar_url, is_featured, is_published, sort_order
team_members:      id, full_name, title, bio, photo_url, instagram, linkedin,
                   sort_order, is_published, profile_id
site_settings:     key(text PK), value(jsonb)    — keys: contact_info, social_links,
                                                    hero_content, business_hours,
                                                    notification_emails, delivery_fee
activity_log:      id, user_id, action, resource_type, resource_id, description

Storage Buckets (all public except avatars):
  products | gallery | team | testimonials | avatars

══ USER ROLES & PERMISSIONS ══════════════════════════════════════

5 roles — each sees a different admin view:

owner:           ALL sections. Can invite team, change roles,
                 manage settings, delete records.
senior_designer: dashboard, appointments, bulk_requests, gallery,
                 testimonials, orders (view)
project_manager: dashboard, appointments, bulk_requests, messages,
                 orders (manage)
shop_manager:    dashboard, products, orders
content_editor:  dashboard, gallery, testimonials

Role-awareness is handled by:
  useAuth()     — provides { profile, can(section), canWrite(section) }
  RequireAuth   — route guard component
  ROLE_PERMISSIONS — permission map in AuthContext.jsx

ALWAYS check permissions before showing write controls:
  {canWrite('products') && <button>Add Product</button>}

══ HOOKS AVAILABLE ════════════════════════════════════════════════

All in src/hooks/useData.js:

  useProducts(filters)         useOrders(filters)
  useBulkRequests(filters)     useAppointments(filters)
  useContactMessages(filters)  useGallery(filters)
  useTestimonials(filters)     useTeamMembers(onlyPublished)
  useSiteSettings()            useProfiles()
  useActivityLog(limit)        useDashboardStats()

  placeOrder(data)             submitContactForm(data)
  bookAppointment(data)        submitBulkRequest(data)
  checkSlotAvailability(d,t)

Storage helpers in src/lib/supabase.js:
  uploadFile(bucket, file, folder)
  getStorageUrl(bucket, path)
  deleteFile(bucket, path)
  BUCKETS.products | gallery | team | testimonials | avatars

══ DESIGN RULES ═══════════════════════════════════════════════════

1. Sharp corners — no rounded-xl, rounded-lg on cards/buttons
   (use rounded-full only for circular elements like avatars)
2. Animation timing: 400–700ms, ease [0.4,0,0.2,1] for luxury feel
3. Never use Inter, Roboto, system-ui, or sans-serif as fallbacks
4. Every form submits to Supabase — no fake data or mock handlers
5. All loading states show branded skeleton/pulse animations
6. All error states show gold/red-tinted error messages
7. Public pages use data from Supabase — no hardcoded arrays
8. Admin pages are NEVER accessible without authentication
9. Log all write operations to activity_log
10. Images use Supabase Storage URLs, not local files
11. Paystack payment fields are stubbed but not yet wired —
    keep placeholder comments: // TODO: Paystack integration

══ CODE QUALITY RULES ═════════════════════════════════════════════

- Each component is a single file, no prop drilling > 2 levels
- Use useCallback and useMemo for expensive operations
- Handle all async operations with try/catch
- Show toast/snackbar feedback for all user actions
- Forms validate client-side before submitting
- Never expose Supabase service_role key in frontend code
- Use lazy() + Suspense for all admin pages (already in App.jsx)
- All admin mutations log to activity_log table
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — YOU DO THIS (not the agent)
Supabase Setup Steps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to supabase.com → New Project
   Name: maxims-interiors
   Password: (save it somewhere safe)
   Region: Europe West (closest to Nigeria)

2. SQL Editor → New Query → paste 001_schema.sql → Run

3. Storage → Create these 5 buckets:
   products     (Public)
   gallery      (Public)
   team         (Public)
   testimonials (Public)
   avatars      (Private)

4. Authentication → Settings:
   Site URL: https://your-app.vercel.app
   Redirect URLs: https://your-app.vercel.app/admin/login
   Enable: Email/Password (turn off "Confirm email" for now)

5. Authentication → Users → Add User:
   Email: maxim@maximsinteriors.com (or owner's email)
   Password: (strong password)
   Then in SQL Editor run:
   UPDATE profiles SET role = 'owner', full_name = 'Maxim Okafor'
   WHERE email = 'maxim@maximsinteriors.com';

6. Settings → API → copy:
   Project URL  → VITE_SUPABASE_URL
   anon/public  → VITE_SUPABASE_ANON_KEY

7. Copy .env.example to .env and fill in your values

8. npm install @supabase/supabase-js


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — BACKEND INTEGRATION PROMPT
(Give to agent after Section 2 is done)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
The Supabase project is live. Now wire every public-facing form and
data display to Supabase. Here is exactly what to connect:

══ PUBLIC PAGES — DATA CONNECTIONS ══════════════════════════════

HOME PAGE (src/pages/Home.jsx)
  Services section:
    - Stays hardcoded (no DB table for services)
  Featured Works:
    - Replace hardcoded WORKS array with:
      const { data: works } = useGallery({ published: true, featured: true })
    - Limit to 5 results, ordered by sort_order
    - Use project.cover_image via getStorageUrl(BUCKETS.gallery, project.cover_image)
    - Keep emoji placeholder as fallback when cover_image is null
  Testimonials carousel:
    - Replace TESTIMONIALS array with:
      const { data: testimonials } = useTestimonials({ published: true, featured: true })
    - Show up to 3 featured testimonials
  Shop Preview:
    - Replace PRODUCTS array with:
      const { data: products } = useProducts({ status: 'active', featured: true })
    - Limit to 4 products
    - Use product.cover_image via getStorageUrl(BUCKETS.products, product.cover_image)
    - Keep emoji fallback when image is null

SHOP PAGE (src/pages/Shop.jsx)
  - Replace all hardcoded PRODUCTS with:
    const { data: products, loading } = useProducts({ status: 'active' })
  - Category filter: derived from unique product.category values in data
  - Sort: handled client-side on the data array
  - Product images: use getStorageUrl(BUCKETS.products, p.cover_image)
  - "Add to Cart" button: for now just show a toast — cart is a
    future feature. Add a comment: // TODO: Cart + Paystack checkout
  - Show loading skeletons (8 product-card-shaped divs with animate-pulse)
    while useProducts is loading

GALLERY PAGE (src/pages/Gallery.jsx)
  - Replace GALS array with:
    const { data: projects, loading } = useGallery({ published: true })
  - Category filter: derived from unique project.category values
  - Grid size classes: use project.grid_size ('small'/'medium'/'large')
  - Images: getStorageUrl(BUCKETS.gallery, project.cover_image)
  - Lightbox: show all project.images[] as a scrollable gallery inside modal
  - Spotlight case study: query for project where is_featured = true, limit 1

TEAM PAGE (src/pages/Team.jsx)
  - Replace TEAM array with:
    const { data: members } = useTeamMembers(true) // onlyPublished=true
  - Photos: getStorageUrl(BUCKETS.team, member.photo_url)
  - Sort by member.sort_order

TESTIMONIALS PAGE (src/pages/Testimonials.jsx)
  - Replace TESTIS array with:
    const { data: testis } = useTestimonials({ published: true })
  - Stars: use testi.rating (1-5)
  - Stats bar: use useDashboardStats() stats.orders.total for projects,
    but for "years" and "rating" keep hardcoded (8 and 4.9★)

ABOUT PAGE (src/pages/About.jsx)
  - Timeline stays hardcoded (historical milestones, won't change often)
  - Team teaser: pull from useTeamMembers(true), limit 3
  - Founder quote: pull from site_settings key "hero_content" or keep hardcoded

══ PUBLIC FORMS — SUPABASE CONNECTIONS ═══════════════════════════

CONTACT FORM (src/pages/Contact.jsx)
  Replace the fake submit button with:

  import { submitContactForm } from '@/hooks/useData'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await submitContactForm({
        full_name: form.name,
        email:     form.email,
        phone:     form.phone,
        service:   form.service,
        message:   form.message,
      })
      setSuccess(true)
      setForm({ name:'', email:'', phone:'', service:'', message:'' })
    } catch (err) {
      setError('Failed to send. Please try again or call us directly.')
    }
    setLoading(false)
  }

  Show a success message: "Thank you! We'll be in touch within 24 hours."
  Show loading state on button while submitting.
  Keep the booking slots UI but add comment:
  // TODO: Wire to appointments table via bookAppointment()

BULK ORDERS FORM (src/pages/BulkOrders.jsx)
  Replace submit with:

  import { submitBulkRequest } from '@/hooks/useData'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await submitBulkRequest({
        company_name:     form.company,
        contact_name:     form.name,
        email:            form.email,
        phone:            form.phone,
        project_type:     form.projectType,
        product_category: form.category,
        quantity:         form.quantity,
        budget_range:     form.budget,
        message:          form.message,
      })
      setSuccess(true)
    } catch (err) {
      setError('Submission failed. Please email us directly.')
    }
    setLoading(false)
  }

  Success state: show a branded confirmation card with the submission
  details and "We'll respond within 48 hours with a custom quote."

APPOINTMENT BOOKING (src/pages/Contact.jsx — booking widget)
  Replace mock time slots with real availability check:

  import { bookAppointment, checkSlotAvailability } from '@/hooks/useData'

  // When user selects a time slot:
  async function selectSlot(date, time) {
    const available = await checkSlotAvailability(date, time)
    if (!available) {
      setSlotError('This slot is no longer available. Please choose another.')
      return
    }
    setSelectedSlot({ date, time })
  }

  // When user confirms:
  async function confirmBooking() {
    await bookAppointment({
      client_name:    bookingForm.name,
      client_email:   bookingForm.email,
      client_phone:   bookingForm.phone,
      type:           'design_consultation',
      preferred_date: selectedSlot.date,
      preferred_time: selectedSlot.time,
      service:        bookingForm.service,
      notes:          bookingForm.notes,
    })
  }

  Available slots: query business_hours from site_settings and
  existing appointments to show only truly open slots.
  Display next 7 days with available times based on business hours.

══ NAVIGATION — DYNAMIC BADGE COUNTS ════════════════════════════

In the Navbar component, for authenticated users (admins visiting
the site), show a subtle admin indicator. Regular visitors see
nothing different.

Navbar "Book Consultation" CTA should scroll to or link to the
booking widget on the Contact page, not just /contact.
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — ADMIN COMPLETION PROMPT
(Give to agent after Section 3 is done)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
Complete the remaining admin pages that are not yet built.
All must follow the AdminLayout wrapper pattern, use the
hooks from useData.js, and respect role permissions via useAuth().

══ PAGES TO BUILD ════════════════════════════════════════════════

1. src/pages/admin/BulkRequests.jsx
   - Table of all bulk_requests, sorted newest first
   - Status filter buttons: all | new | reviewing | quoted | accepted | declined | completed
   - Color coding: new=gold, reviewing=blue, quoted=purple, accepted=green, declined=red
   - Click row to open detail modal:
     • Customer info (company, contact, phone, email)
     • Project details (type, category, quantity, budget_range, message)
     • Status dropdown (only visible to PM+ role)
     • Quote amount input (only visible when status = 'quoted')
     • Internal notes textarea (staff only, never shown to public)
     • "Assign to" dropdown from profiles list (owner only)
     • Save button calls updateBulkStatus(id, status, notes)
   - Badge count: show "new" count in sidebar

2. src/pages/admin/Messages.jsx
   - List of contact_messages, unread first
   - Status filter: unread | read | replied | archived
   - Each row: sender name, subject preview (first 60 chars of message), date, status badge
   - Click opens a clean email-style modal:
     • Full message content
     • Contact info (email, phone, service)
     • "Mark as Read" button (shows if status = unread)
     • Reply textarea + "Send Reply" button (calls replyToMessage)
     • "Archive" button
   - Unread messages have a subtle gold left border

3. src/pages/admin/Gallery.jsx (admin version)
   - Grid of all gallery_projects (published + unpublished)
   - Each card: cover image (or placeholder emoji), title, category,
     is_published toggle, sort_order input, Edit/Delete buttons
   - "Add Project" button opens ProjectForm modal:
     • Fields: title, slug (auto-generated), category, location, year,
       grid_size (small/medium/large), description, sqft, duration, client_name
     • Image upload section: upload multiple images via uploadFile(BUCKETS.gallery, file)
       First uploaded image becomes cover_image automatically
       Can drag to reorder images (or simple "Set as Cover" buttons)
       Can remove individual images
     • is_published toggle
     • is_featured toggle
   - Table also shows a sort_order field so owner can reorder the grid
   - On save: calls upsertGalleryProject(project)

4. src/pages/admin/Testimonials.jsx (admin version)
   - Card grid of all testimonials
   - Each card: quote preview, author, rating stars, is_featured badge
   - Toggles: is_published, is_featured (inline on each card)
   - Add/Edit modal:
     • Fields: client_name, client_role, quote (textarea), rating (1-5 star picker),
       project_type, avatar_url (image upload from BUCKETS.testimonials)
     • is_published, is_featured toggles
   - Reorder: sort_order field (lower = higher on site)
   - Delete with confirmation

5. src/pages/admin/Team.jsx (admin version — different from public Team page)
   - Manages team_members table (public-facing profiles)
   - Cards showing: photo placeholder, name, title, is_published toggle
   - Add/Edit modal:
     • Fields: full_name, title, bio, photo upload (BUCKETS.team),
       instagram, linkedin, sort_order
     • profile_id dropdown: optionally link to an auth profile
       (so admin user's changes appear on their team card)
   - Delete with confirmation

6. src/pages/admin/Activity.jsx
   - Audit log table, newest first, limit 100
   - Shows: timestamp, user avatar + name, action verb, resource type,
     description of what changed
   - Color coding: created=green, updated=gold, deleted=red, status_changed=blue
   - Filter by: resource_type, user, date range
   - Owner only — other roles are redirected
   - No write actions — read-only

══ ADMIN GALLERY & PRODUCT IMAGE UPLOADS ════════════════════════

For every image upload field across all admin pages, use this pattern:

  async function handleImageUpload(e, bucket, folder) {
    const files = Array.from(e.target.files)
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Max file size is 5MB')
        continue
      }
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
        setError('Only JPG, PNG, and WebP are accepted')
        continue
      }
      setUploading(true)
      try {
        const path = await uploadFile(bucket, file, folder)
        const url  = getStorageUrl(bucket, path)
        // add url to form.images array
      } catch (err) { setError('Upload failed') }
      setUploading(false)
    }
  }

Show a progress indicator while uploading.
Show thumbnail previews of uploaded images.
Allow removing uploaded images.

══ ACTIVITY LOGGING ════════════════════════════════════════════

Every time an admin creates, updates, or deletes a record, log it:

  import { logActivity } from '@/hooks/useData'

  // After successful upsert:
  await logActivity({
    userId:       profile.id,
    action:       product.id ? 'updated' : 'created',
    resourceType: 'product',
    resourceId:   savedProduct.id,
    description:  `${action} product "${savedProduct.name}"`,
    oldValue:     product.id ? original : null,
    newValue:     savedProduct,
  })

Do this for: products, orders, gallery_projects, testimonials,
team_members, bulk_requests (status changes), appointments (status changes).
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — ADMIN DASHBOARD REAL-TIME PROMPT
(Give after Section 4 is done)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
Add real-time updates to the admin dashboard so it refreshes
automatically when new orders, appointments, or messages arrive.

The Supabase realtime channel is already wired in useRealtimeTable().
These tables already have realtime enabled: orders, appointments,
contact_messages, bulk_requests.

Tasks:

1. Dashboard notification toast:
   When a new row is inserted into any of the realtime tables
   while an admin is on the dashboard, show a branded toast:
   - Bottom-right, slides in from right
   - Dark gold-bordered card
   - Icon + message: "🛍 New order from Adaeze Nwosu"
   - Auto-dismisses after 5 seconds
   - Clicking the toast navigates to the relevant section

   Implement using a simple toast context:
   src/context/ToastContext.jsx — { addToast, toasts }
   src/components/admin/ToastContainer.jsx — renders the toasts

2. Sidebar badge counts:
   Connect the badgeCounts prop in AdminLayout to live data:
   {
     orders:       stats.orders.pending,
     appointments: stats.appointments.pending,
     bulk:         stats.bulk.new,
     messages:     stats.messages.unread,
     total:        (sum of above)
   }
   The top bar notification bell should show the total count.

3. Dashboard stats auto-refresh:
   useDashboardStats() should re-fetch when the window gains focus:
   document.addEventListener('visibilitychange', ...)
   This ensures counts are fresh if the admin was away.
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — EMAIL NOTIFICATIONS PROMPT
(Give after Section 5 is done)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
Set up transactional emails using Resend (resend.com — free tier,
3,000 emails/month).

Install: npm install resend

Since we can't call Resend directly from the frontend (API key
would be exposed), create a Supabase Edge Function for each email:

══ SUPABASE EDGE FUNCTIONS TO CREATE ════════════════════════════

Go to: Supabase Dashboard → Edge Functions → New Function

1. send-contact-notification
   Trigger: called after a contact_messages row is inserted
   Logic:
   - Fetch the new message
   - Send email to NOTIFICATION_EMAIL:
     Subject: "New Enquiry from {full_name} — Maxims Interiors"
     Body: HTML email with client details + message content
   - Send auto-reply to client:
     Subject: "Thank you for reaching out — Maxims Interiors"
     Body: Elegant branded HTML confirming receipt

2. send-appointment-confirmation
   Trigger: called when appointment status changes to 'confirmed'
   Logic:
   - Fetch appointment + client details
   - Send confirmation to client:
     Subject: "Your Consultation is Confirmed — Maxims Interiors"
     Body: Date, time, location, what to expect, contact number

3. send-order-confirmation
   Trigger: called when order is created
   Logic:
   - Fetch order + items
   - Send receipt to customer:
     Subject: "Order Received — {order_number} — Maxims Interiors"
     Body: Order summary, items, total, next steps

4. send-bulk-quote
   Trigger: called when bulk_request status changes to 'quoted'
   Logic:
   - Send quote to client with quote_amount and quote_notes
   - CC the assigned staff member

══ EMAIL HTML TEMPLATE (use this branded template) ═══════════════

All emails should use this structure:

  Background: #1C0D35 (purple-darkest)
  Header bar: 4px solid #C9A84C (gold) at top
  Logo: "M" in gold circle + "MAXIMS" in Cinzel
  Body bg: #FFFFFF
  Headline: Cormorant Garamond or Georgia serif
  Body text: Lato or Arial, #3D3B50
  CTA button: #C9A84C background, #1C0D35 text
  Footer: dark purple, gold text, copyright

Place the Edge Function code (Deno/TypeScript) in:
  supabase/functions/send-contact-notification/index.ts
  supabase/functions/send-appointment-confirmation/index.ts
  etc.

Deploy with: supabase functions deploy send-contact-notification

══ WEBHOOK TRIGGERS ════════════════════════════════════════════

In Supabase Dashboard → Database → Webhooks, create:
  Name: on_contact_message
  Table: contact_messages
  Events: INSERT
  URL: https://{your-project}.supabase.co/functions/v1/send-contact-notification

  Name: on_appointment_confirmed
  Table: appointments
  Events: UPDATE
  URL: ...send-appointment-confirmation

  Name: on_order_created
  Table: orders
  Events: INSERT
  URL: ...send-order-confirmation
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 — PAYSTACK PREPARATION PROMPT
(Prepare now, wire later)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
Prepare the codebase for Paystack integration without activating it.
This lets us flip a switch to enable payments later.

1. Create src/hooks/usePaystack.js:

   export function usePaystack() {
     const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY

     // TODO: Install @paystack/inline-js when ready
     // npm install @paystack/inline-js

     function initializePayment({ amount, email, name, phone, orderId, onSuccess, onCancel }) {
       // TODO: Paystack integration
       // const handler = PaystackPop.setup({
       //   key: publicKey,
       //   email, amount: amount * 100,  // Paystack uses kobo
       //   currency: 'NGN',
       //   ref: orderId,
       //   metadata: { custom_fields: [{ display_name: 'Customer', value: name }] },
       //   callback: (response) => onSuccess(response),
       //   onClose: () => onCancel(),
       // })
       // handler.openIframe()
       console.log('TODO: Paystack not yet configured')
     }

     return { initializePayment, isConfigured: !!publicKey }
   }

2. In Shop.jsx cart (future):
   Add a cart state (useReducer — add/remove/update items, total)
   Checkout button calls initializePayment()
   On Paystack callback success: call placeOrder() with payment_ref
   Add comment: // TODO: Paystack — update order payment_status on webhook

3. In orders table, payment_ref column stores the Paystack reference
   A Supabase Edge Function (verify-payment) will:
   - Receive Paystack webhook
   - Verify transaction via Paystack API
   - Update order payment_status = 'paid'

4. Add VITE_PAYSTACK_PUBLIC_KEY= to .env.example
   (leave the value blank — owner fills in when ready)
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 — PERFORMANCE & SEO PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
Optimize the site for production performance and SEO.

1. Meta tags — create src/components/Meta.jsx:
   Uses React Helmet or document.title + meta tags per page.
   Every page should have unique title + description + og:image.

   Default: "Maxims Interiors & Home Goods — Where Luxury Meets Living"
   Home:    "Maxims Interiors — Premium Interior Design in Nigeria"
   Shop:    "Shop Luxury Home Goods — Maxims Interiors"
   Gallery: "Portfolio — Maxims Interiors Interior Design"
   Contact: "Book a Design Consultation — Maxims Interiors"

2. Images — all gallery and product images that come from Supabase Storage:
   - Add loading="lazy" to all <img> tags not in the viewport
   - Add appropriate width + height attributes
   - Use Supabase image transformations for thumbnails:
     supabase.storage.from(bucket).getPublicUrl(path, {
       transform: { width: 400, height: 400, resize: 'cover' }
     })
   - Use a placeholder blur/shimmer div while images load

3. Code splitting — already done via lazy() in App.jsx.
   Verify all admin pages are lazy-loaded.
   Add: vite.config.js → build.rollupOptions.output.manualChunks
   Group: vendor (react, framer), three (three.js), admin (admin pages)

4. .gitignore — make sure these are ignored:
   .env, .env.local, node_modules/, dist/

5. robots.txt in /public:
   User-agent: *
   Disallow: /admin
   Disallow: /admin/*
   Allow: /

6. sitemap.xml in /public — list all public pages

7. vercel.json in project root:
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
     "headers": [{
       "source": "/admin/(.*)",
       "headers": [{ "key": "X-Robots-Tag", "value": "noindex" }]
     }]
   }
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9 — 21ST.DEV UPGRADE PROMPT
(Give this after all backend work is done)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
Upgrade the UI with 21st.dev components. Install them first:

npx shadcn@latest init   (if not done already)
npx shadcn@latest add "https://21st.dev/r/magicui/number-ticker"
npx shadcn@latest add "https://21st.dev/r/magicui/marquee"
npx shadcn@latest add "https://21st.dev/r/magicui/text-reveal"
npx shadcn@latest add "https://21st.dev/r/magicui/shiny-button"
npx shadcn@latest add "https://21st.dev/r/aceternity/3d-card-effect"
npx shadcn@latest add "https://21st.dev/r/aceternity/moving-border"
npx shadcn@latest add "https://21st.dev/r/serafimcloud/testimonials-marquee"
npx shadcn@latest add "https://21st.dev/r/aceternity/parallax-scroll"

Then apply these upgrades:

HOME — Stats section: wrap each number in <NumberTicker value={n} />
HOME — Marquee strip: replace custom marquee with <Marquee> component
HOME — About headline: wrap in <TextReveal> on scroll
HOME — Primary CTA: wrap "Explore Our Work" in <ShinyButton>
HOME — Service cards: wrap each card in <ThreeDCard>
HOME — Testimonials: replace custom slider with <TestimonialsMarquee>
HOME — "Book Consultation" footer CTA: wrap in <MovingBorder>
GALLERY — Project grid: use <ParallaxScroll> for the image grid
SHOP — Product cards: wrap in <ThreeDCard>

Brand override for ALL 21st.dev components — add this to the
wrapper div of each installed component:

  style={{
    '--primary': '#C9A84C',
    '--primary-foreground': '#1C0D35',
    '--background': 'transparent',
    '--card': '#1E1C2C',
    '--border': 'rgba(201,168,76,0.15)',
  }}

And override their font classes:
  Any .text-xl, .text-2xl → add className="font-display"
  Any uppercase labels → add className="font-title tracking-[0.2em]"
  Any description text → add className="font-body"
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10 — VERCEL DEPLOYMENT CHECKLIST
(You do this — not the agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Push your project to GitHub (github.com → New Repository)
   git init
   git add .
   git commit -m "Initial production build"
   git remote add origin https://github.com/yourusername/maxims-interiors.git
   git push -u origin main

2. Go to vercel.com → Import Project → select your GitHub repo

3. Build Settings (Vercel auto-detects Vite):
   Framework: Vite
   Build Command: npm run build
   Output Directory: dist

4. Environment Variables in Vercel Dashboard → Settings → Env Vars:
   Add all variables from your .env file:
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_RESEND_API_KEY
   VITE_NOTIFICATION_EMAIL
   VITE_APP_URL  (set to your Vercel URL: https://maxims-interiors.vercel.app)

5. Add vercel.json to project root:
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }

6. Update Supabase Auth Settings with your Vercel URL:
   Authentication → Settings → Site URL: https://maxims-interiors.vercel.app
   Add to Redirect URLs: https://maxims-interiors.vercel.app/admin/login

7. Deploy → every git push to main auto-deploys

8. Custom domain (when ready):
   Vercel → Domains → Add → maximsinteriors.com
   Update DNS at your registrar with Vercel's nameservers
   Update Supabase Site URL with the custom domain

9. Preview URLs — every git branch automatically gets a preview URL:
   https://maxims-interiors-git-feature-branch.vercel.app
   Share preview links with stakeholders before merging to main

══ FREE TIER LIMITS TO KNOW ══════════════════════════════════════

Vercel (Hobby — free):
  100GB bandwidth/month
  Unlimited deployments
  100 serverless function invocations/day (not needed for this stack)

Supabase (Free):
  500MB database storage
  1GB file storage
  50MB file upload limit
  500K Edge Function invocations/month
  2 active projects

Resend (Free):
  3,000 emails/month
  100 emails/day

When to upgrade: once the site is generating consistent orders,
upgrade Supabase to Pro ($25/month) for daily backups and higher limits.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 11 — QUICK REFERENCE: ADMIN ROLE CAPABILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OWNER (Maxim Okafor — your step mum):
  ✓ All sections, full read + write + delete
  ✓ Invite/remove team members
  ✓ Change team member roles
  ✓ Edit site settings, contact info, social links
  ✓ View activity log
  ✓ Can see and manage everything

SENIOR DESIGNER:
  ✓ Dashboard + stats
  ✓ Appointments (view + confirm/cancel)
  ✓ Bulk Requests (view + update status)
  ✓ Gallery (add/edit/delete projects + upload images)
  ✓ Testimonials (add/edit/delete + toggle published)
  ✓ Orders (view only — no status changes)
  ✗ No: products, messages, settings, team management, activity log

PROJECT MANAGER:
  ✓ Dashboard + stats
  ✓ Appointments (full management — confirm, cancel, reschedule)
  ✓ Bulk Requests (full management — add quotes, update status)
  ✓ Messages (read + reply + archive)
  ✓ Orders (full management — update status, assign)
  ✗ No: products, gallery, testimonials, settings, team

SHOP MANAGER:
  ✓ Dashboard (orders + products stats only)
  ✓ Products (add/edit/delete, manage stock, toggle status)
  ✓ Orders (full management)
  ✗ No: appointments, bulk requests, messages, gallery, testimonials, settings

CONTENT EDITOR:
  ✓ Dashboard (minimal view)
  ✓ Gallery (add/edit/delete projects + upload images)
  ✓ Testimonials (add/edit/delete + toggle published)
  ✗ No: orders, products, appointments, bulk requests, messages, settings


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 12 — TROUBLESHOOTING REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Error: Missing Supabase environment variables"
  → Check .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
  → Restart dev server after editing .env

"Auth session not found" in admin
  → Go to /admin/login and sign in
  → Check Supabase Auth → Users that the user exists

"Policy violation" when fetching data
  → Check RLS policies in Supabase → Authentication → Policies
  → Verify the user's role in the profiles table

"Image not loading from Storage"
  → Check bucket is set to Public in Supabase Storage
  → Verify the image was uploaded successfully (check bucket in dashboard)
  → Use getStorageUrl() helper, not direct path concatenation

"Realtime not working"
  → Check Supabase → Database → Replication → tables are enabled
  → Enable realtime for: orders, appointments, contact_messages, bulk_requests

"Build failing on Vercel"
  → Check environment variables are set in Vercel dashboard
  → Run npm run build locally first to catch errors
  → Check for any TypeScript errors or missing imports
