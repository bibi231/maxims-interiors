// server/src/seedReviews.js
// Re-runnable: removes seeded placeholder reviews and ensures Ms Christine
// Miner's review is present + featured. Safe on an existing database.
// Run: node src/seedReviews.js
import 'dotenv/config'
import { connectDB } from './config/db.js'
import { Testimonial } from './models.js'

const PLACEHOLDERS = ['Chief Emmanuel Okafor', 'Dr. Ngozi Adeyemi']

async function run() {
  await connectDB(process.env.MONGODB_URI)

  const removed = await Testimonial.deleteMany({ client_name: { $in: PLACEHOLDERS } })
  console.log(`• Removed ${removed.deletedCount} placeholder review(s)`)

  await Testimonial.findOneAndUpdate(
    { client_name: 'Ms Christine Miner' },
    {
      client_name: 'Ms Christine Miner',
      client_role: 'Private Client · Abuja',
      quote: 'Maxims understood exactly the feeling I wanted for my home — warm, elegant, and completely my own. Every detail was considered, the team was a joy to work with, and the final reveal genuinely took my breath away.',
      rating: 5,
      project_type: 'Full Home Design',
      is_featured: true,
      is_published: true,
      sort_order: 0,
    },
    { upsert: true, new: true },
  )
  console.log('✓ Christine Miner review ensured (featured)')
  console.log('\n✅ Reviews updated.')
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
