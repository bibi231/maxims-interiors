// server/src/seed.js
// Seeds the owner account, site settings, and sample content.
// Run once: npm run seed   (safe to re-run — upserts, won't duplicate)
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDB } from './config/db.js'
import { User, Setting, Product, Gallery, Testimonial } from './models.js'

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

async function run() {
  await connectDB(process.env.MONGODB_URI)

  // ── Owner ──
  const email = (process.env.OWNER_EMAIL || 'maxim@maximsinteriors.com').toLowerCase()
  const existing = await User.findOne({ email })
  if (!existing) {
    await User.create({
      email,
      password_hash: await bcrypt.hash(process.env.OWNER_PASSWORD || 'changeme123', 12),
      full_name: process.env.OWNER_NAME || 'Christine J-K Gadzama',
      role: 'owner',
    })
    console.log('✓ Owner created:', email)
  } else {
    console.log('• Owner already exists:', email)
  }

  // ── Site settings ──
  const settings = {
    contact_info: { phone: '+234 800 000 0000', email: 'hello@maximsinteriors.com', address: '123 Design Boulevard, Wuse 2, Abuja, FCT', hours: 'Mon–Sat: 9am–7pm WAT' },
    social_links: { instagram: '', facebook: '', linkedin: '', youtube: '' },
    hero_content: { headline: 'Where Luxury Meets Living', subtext: 'Transforming spaces into timeless experiences' },
    delivery_fee: 5000,
  }
  for (const [key, value] of Object.entries(settings)) {
    await Setting.findOneAndUpdate({ key }, { value }, { upsert: true })
  }
  console.log('✓ Settings seeded')

  // ── Sample products ──
  if (await Product.countDocuments() === 0) {
    const products = [
      ['Elara Accent Chair', 185000, 'Living Room', 'New Arrival', 12, true],
      ['Aurum Candle Collection', 24500, 'Décor', 'Staff Pick', 45, true],
      ['Abstrakt Canvas Triptych', 92000, 'Wall Art', null, 8, false],
      ['Onyx Marble Planter Trio', 41000, 'Greenery', 'Sale', 22, true],
      ['Vela Pendant Light', 68000, 'Lighting', null, 6, false],
      ['Lagos Woven Area Rug', 127000, 'Rugs', 'New Arrival', 9, true],
      ['Waffle Towel Set (3pc)', 18500, 'Bathroom', 'Best Seller', 60, true],
      ['Linen Cushion Quartet', 32000, 'Living Room', 'New Arrival', 40, true],
    ]
    await Product.insertMany(products.map(([name, price, category, badge, stock_qty, is_featured]) => ({
      name, slug: slug(name), price, category, badge, stock_qty, is_featured, status: 'active',
      description: 'A signature Maxims piece — replace with real photography and copy from the admin.',
    })))
    console.log('✓ Sample products seeded')
  }

  // ── Sample gallery ──
  if (await Gallery.countDocuments() === 0) {
    const projects = [
      ['The Laurent Residence', 'Living Room', 'Maitama, Abuja', 2024, 'large', true],
      ['Okonkwo Master Suite', 'Bedroom', 'Lekki, Lagos', 2024, 'small', false],
      ['Meridian Hotel Lobby', 'Commercial', 'CBD, Abuja', 2023, 'medium', true],
      ['The Pinnacle Penthouse', 'Living Room', 'Ikoyi, Lagos', 2022, 'large', true],
    ]
    await Gallery.insertMany(projects.map(([title, category, location, year, grid_size, is_featured]) => ({
      title, slug: slug(title), category, location, year, grid_size, is_featured, is_published: true,
    })))
    console.log('✓ Sample gallery seeded')
  }

  // ── Sample testimonials ──
  if (await Testimonial.countDocuments() === 0) {
    await Testimonial.insertMany([
      { client_name: 'Ms Christine Miner', client_role: 'Private Client · Abuja', quote: 'Maxims understood exactly the feeling I wanted for my home — warm, elegant, and completely my own. Every detail was considered, the team was a joy to work with, and the final reveal genuinely took my breath away.', rating: 5, project_type: 'Full Home Design', is_featured: true, is_published: true, sort_order: 0 },
      { client_name: 'Adaeze Nwosu', client_role: 'Homeowner · Lekki Phase 1', quote: 'Working with Maxims was extraordinary. They transformed our home into a space of refined, liveable elegance.', rating: 5, project_type: 'Living Room & Master Suite', is_featured: true, is_published: true, sort_order: 1 },
    ])
    console.log('✓ Testimonials seeded')
  }

  console.log('\n✅ Seed complete.')
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
