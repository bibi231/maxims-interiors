// server/src/migrate-users.js
// One-time migration:
//  1. Updates Christine's email from the old Gmail to christinegadzama@maximsinterior.com.ng
//  2. Removes the placeholder "Maxim Okafor" seeded account
//  3. Creates the professional mailbox staff accounts if they don't already exist
// Run with: node src/migrate-users.js
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDB } from './config/db.js'
import { User } from './models.js'

async function run() {
  await connectDB(process.env.MONGODB_URI)
  console.log('Connected to DB…\n')

  // 1. Update Christine's own account email
  const old = await User.findOneAndUpdate(
    { email: 'maximsinteriorandhomegoods@gmail.com' },
    { email: 'christinegadzama@maximsinterior.com.ng' },
    { new: true }
  )
  if (old) console.log('✓ Christine email updated →', old.email)
  else console.log('• Christine old Gmail not found (may already be updated)')

  // 2. Remove the placeholder seeded account (Maxim Okafor / info@...)
  //    We'll replace it with the proper "info" mailbox entry below.
  const removed = await User.deleteOne({ email: 'info@maximsinterior.com.ng', full_name: /maxim okafor/i })
  if (removed.deletedCount) console.log('✓ Removed placeholder "Maxim Okafor" account')
  else console.log('• Placeholder account not found (may already be removed)')

  // 3. Staff accounts — email → { name, role, title }
  const accounts = [
    {
      email:    'info@maximsinterior.com.ng',
      full_name: 'Maxims Info Desk',
      title:    'General Enquiries',
      role:     'shop_manager',
      password: process.env.STAFF_DEFAULT_PASSWORD || 'Maxims2026!',
    },
    {
      email:    'admin@maximsinterior.com.ng',
      full_name: 'Site Administrator',
      title:    'Platform Administration',
      role:     'project_manager',
      password: process.env.STAFF_DEFAULT_PASSWORD || 'Maxims2026!',
    },
    {
      email:    'contact@maximsinterior.com.ng',
      full_name: 'Maxims Contact Desk',
      title:    'Client Relations',
      role:     'content_editor',
      password: process.env.STAFF_DEFAULT_PASSWORD || 'Maxims2026!',
    },
    {
      email:    'support@maximsinterior.com.ng',
      full_name: 'Maxims Support',
      title:    'Customer Support',
      role:     'shop_manager',
      password: process.env.STAFF_DEFAULT_PASSWORD || 'Maxims2026!',
    },
  ]

  for (const acc of accounts) {
    const exists = await User.findOne({ email: acc.email })
    if (exists) {
      console.log(`• ${acc.email} already exists — skipping`)
      continue
    }
    const hashed = await bcrypt.hash(acc.password, 12)
    await User.create({
      email:         acc.email,
      full_name:     acc.full_name,
      title:         acc.title,
      role:          acc.role,
      password_hash: hashed,
      is_active:     true,
    })
    console.log(`✓ Created: ${acc.email} (${acc.role})`)
  }

  console.log('\n✅ Migration complete.')
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
