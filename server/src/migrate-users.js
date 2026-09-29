// server/src/migrate-users.js
// Creates / repairs the staff accounts on the MariaDB database.
//
//  1. Moves Christine's legacy Gmail login to christinegadzama@maximsinterior.com.ng
//  2. Removes the old placeholder "Maxim Okafor" account
//  3. Creates the mailbox staff accounts WITHOUT a password and emails each a
//     72-hour, single-use set-up link (the same flow as Admin > Team > Add staff)
//
// No default password exists anywhere. Options:
//   --print-links      also print each set-up link to this console (use if email is down)
//   --resend           send a fresh set-up link to accounts that already exist
//   --temp-passwords   instead of links, give each NEW account a random temporary
//                      password, printed once here (share privately; staff should
//                      change it after signing in)
//
// Run: npm run staff   (node src/migrate-users.js [--print-links] [--resend] [--temp-passwords])
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { closeDB } from './config/db.js'
import { User } from './models.js'
import { sendSetupEmail } from './utils/staffInvite.js'

const args = new Set(process.argv.slice(2))
const PRINT = args.has('--print-links')
const RESEND = args.has('--resend')
const TEMP = args.has('--temp-passwords')

const ACCOUNTS = [
  { email: 'christinegadzama@maximsinterior.com.ng', full_name: 'Christine J-K Gadzama', title: 'Owner',                   role: 'owner' },
  { email: 'admin@maximsinterior.com.ng',            full_name: 'Site Administrator',    title: 'Platform Administration', role: 'project_manager' },
  { email: 'info@maximsinterior.com.ng',             full_name: 'Maxims Info Desk',      title: 'General Enquiries',       role: 'shop_manager' },
  { email: 'support@maximsinterior.com.ng',          full_name: 'Maxims Support',        title: 'Customer Support',        role: 'shop_manager' },
  { email: 'contact@maximsinterior.com.ng',          full_name: 'Maxims Contact Desk',   title: 'Client Relations',        role: 'content_editor' },
]

async function invite(user) {
  const r = await sendSetupEmail(user)
  console.log(r.ok
    ? `  set-up link emailed to ${user.email}`
    : `  EMAIL FAILED for ${user.email}: ${r.error} (check SMTP_*; re-run with --resend --print-links)`)
  if (PRINT) console.log(`  link: ${r.url}`)
}

async function run() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set (set-up links are signed with it)')

  // 1. Legacy Gmail login -> domain mailbox
  const legacy = await User.findOne({ email: 'maximsinteriorandhomegoods@gmail.com' })
  if (legacy && !(await User.findOne({ email: ACCOUNTS[0].email }))) {
    legacy.email = ACCOUNTS[0].email
    await legacy.save()
    console.log('✓ Christine email updated →', legacy.email)
  }

  // 2. Placeholder seeded account
  const removed = await User.deleteOne({ email: 'info@maximsinterior.com.ng', full_name: /maxim okafor/i })
  if (removed.deletedCount) console.log('✓ Removed placeholder "Maxim Okafor" account')

  // 3. Staff accounts
  const temps = []
  for (const acc of ACCOUNTS) {
    const exists = await User.findOne({ email: acc.email })
    if (exists) {
      console.log(`• ${acc.email} already exists (${exists.role})`)
      if (RESEND && exists.is_active) await invite(exists)
      continue
    }
    const temp = TEMP ? crypto.randomBytes(12).toString('base64url') : null
    // Without --temp-passwords the hash is of random bytes nobody knows, so the
    // account is unusable until the mailbox owner sets a password via the link.
    const password_hash = await bcrypt.hash(temp || crypto.randomBytes(24).toString('hex'), 12)
    const user = await User.create({ ...acc, password_hash, is_active: true, invite_pending: !TEMP })
    console.log(`✓ Created ${user.email} (${user.role})`)
    if (TEMP) temps.push([user.email, temp])
    else await invite(user)
  }

  if (temps.length) {
    console.log('\nTemporary passwords (shown once, not stored anywhere):')
    for (const [e, p] of temps) console.log(`  ${e}  ${p}`)
  }
  console.log('\n✅ Staff accounts done.')
}

run()
  .then(() => closeDB())
  .catch(async (e) => { console.error(e.message || e); await closeDB().catch(() => {}); process.exit(1) })
