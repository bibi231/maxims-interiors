// scripts/attach-photos.mjs
// Attaches the already-uploaded Cloudinary photos to existing/new products and
// gallery projects, writing DIRECTLY to MongoDB Atlas. No API/login needed.
//
// RUN:  MONGODB_URI="<your atlas uri>" node scripts/attach-photos.mjs
// (the URI is the same MONGODB_URI you set in Vercel env)
import mongoose from 'mongoose'
import { Product, Gallery } from '../server/src/models.js'
import { connectDB } from '../server/src/config/db.js'

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
// filename -> Cloudinary URL
const MAP = {
  "colored pillow 7.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139491/maxims/catalog/hm4uwl7u9q5e8t1oapcr.jpg",
  "colored pillow 4.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139492/maxims/catalog/tnkbocfv5pbqieklexog.jpg",
  "colored pillow 1.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139492/maxims/catalog/d2kv0gvkolqqke91vj2n.jpg",
  "colored pillow 3.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139492/maxims/catalog/ywcxwupbdihuwxav7fsu.jpg",
  "colored pillow 6.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139492/maxims/catalog/fwvlycr1vtdmn6gscufw.jpg",
  "colored pillow 5.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139492/maxims/catalog/temyja2zylxaxnqua9mw.jpg",
  "colored pillow 2.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139492/maxims/catalog/okdso6jjuleuo0zpe7f9.jpg",
  "blankets.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139493/maxims/catalog/cns3rcyxchozzg4yyrv6.jpg",
  "colored pillow 8.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139494/maxims/catalog/xtejdwzjm6qe0s212mzg.jpg",
  "different colored pillows.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139494/maxims/catalog/ehbgxrhlci0jt48r7rlo.jpg",
  "for store 4.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139494/maxims/catalog/rmhpcxdhvwpzjwkayqfw.jpg",
  "for store 2.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139494/maxims/catalog/nv6whvuco0fxiookohbr.jpg",
  "for store 1.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139494/maxims/catalog/vfc33nohr4wq3nlztify.jpg",
  "iitems for store .jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139494/maxims/catalog/q9m2x9ztvpvgupncfw5p.jpg",
  "for store 3.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139494/maxims/catalog/ayfbcmgddnvznhbhhqgt.jpg",
  "instore item 2.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139495/maxims/catalog/avfetuamu4uswxzhy1ym.jpg",
  "items for store 1.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139496/maxims/catalog/t9dghaejmgsikbp9ipxc.jpg",
  "instore item.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139496/maxims/catalog/lj0ubjh0zpkij1pmelvt.jpg",
  "items for store all color.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139496/maxims/catalog/foogtzntitvdjs0ghr6d.jpg",
  "items for store different color.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139496/maxims/catalog/b3vbfhvxn2by0ec7uyql.jpg",
  "more pillows.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139496/maxims/catalog/vbrcboibaztw2z3tkkya.jpg",
  "office 1.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139497/maxims/catalog/hkqzxjokwfph8yh53ngu.jpg",
  "office 2.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139497/maxims/catalog/sle2plfntdy98jadkxu6.jpg",
  "office 3.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139497/maxims/catalog/d6xd9ofkacpntna6h73i.jpg",
  "pillow 11.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139498/maxims/catalog/yxgwkdepdaermazcfyyt.jpg",
  "pillow 10.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139498/maxims/catalog/g9wxz1aou8zq9tfrxjot.jpg",
  "office 6.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139498/maxims/catalog/tnyi7pbpspok7dexdpbn.jpg",
  "pillow 12.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139499/maxims/catalog/v54sfhdjpj5izvpktzug.jpg",
  "pillow 13.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139499/maxims/catalog/wfjoy19exsrhexs2x2cj.jpg",
  "office 5.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139499/maxims/catalog/fbzk0fyovhuvygngzkel.jpg",
  "pillow 14.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139500/maxims/catalog/l0dyb4ccj0sibmdjxwec.jpg",
  "office 4.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139500/maxims/catalog/ty59hh9jmkvboic8i103.jpg",
  "pillow 5.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139501/maxims/catalog/yvfektsxo1h8hd06lajv.jpg",
  "pillow 6.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139501/maxims/catalog/ktcosw2l8ubcwj08c1px.jpg",
  "pillow 3.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139501/maxims/catalog/dvayifwfev2cs0vqyf4x.jpg",
  "pillow 4.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139501/maxims/catalog/eomh2u8oc89kjixdoh2o.jpg",
  "pillow 7.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139502/maxims/catalog/pckcobdghda6in7tmd5f.jpg",
  "pillow 2.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139503/maxims/catalog/e1tcm5dksqhnzi97sfvp.jpg",
  "pillow 8.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139503/maxims/catalog/axch4cutelzgmu2yfl70.jpg",
  "pillow.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139503/maxims/catalog/f8kx8jwejvkohqxrlivl.jpg",
  "throw pillow 2.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139504/maxims/catalog/phrj24h1sm8gucbqgjik.jpg",
  "throw pillow 1.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139504/maxims/catalog/gghpggkxvd4dofgdzyfy.jpg",
  "pillows.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139505/maxims/catalog/nztrbtbasgzqqg8gpvao.jpg",
  "throw pillow 3.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139504/maxims/catalog/jdncsiozgackavkqmdrb.jpg",
  "pillow 9.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139505/maxims/catalog/zz7xa9exdfsyx2medm82.jpg",
  "throw pillow 4.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139505/maxims/catalog/axqgcwluijeifhlcrcmi.jpg",
  "throw pillow 5.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139505/maxims/catalog/svnerw4gdb7hhkfx2str.jpg",
  "throw pillow 6.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139506/maxims/catalog/mfrjwbkt04smldlmke2p.jpg",
  "towels 2.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139506/maxims/catalog/jzu0eegbhytmwbyrwnts.jpg",
  "towels .jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139506/maxims/catalog/yffyrnfitmrealtgbn78.jpg",
  "towl 3.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139507/maxims/catalog/py6zots1bhqynhalasbk.jpg",
  "towl 4.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139507/maxims/catalog/iqnqs2dnzjrjf5cfqfh8.jpg",
  "towl 2.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139508/maxims/catalog/nungx4tmmop8lw6c7ot1.jpg",
  "towl.jpeg": "https://res.cloudinary.com/dckmnbwcv/image/upload/v1782139508/maxims/catalog/fksmwmpgv6jzmkk0oru4.jpg",
}
const U = (...names) => names.map(n => MAP[n]).filter(Boolean)

async function run() {
  await connectDB()
  console.log('connected to Atlas')

  const setImgs = async (name, imgs) => {
    const p = await Product.findOne({ name })
    if (!p) { console.log('  MISSING product:', name); return }
    p.images = imgs; p.cover_image = imgs[0]; await p.save()
    console.log('  updated', name, imgs.length, 'imgs')
  }
  await setImgs('Waffle Towel Set (3pc)', U('towl.jpeg','towl 2.jpeg','towl 3.jpeg'))
  await setImgs('Linen Cushion Quartet', U('throw pillow 1.jpeg','throw pillow 3.jpeg','colored pillow 1.jpeg','pillow 4.jpeg'))

  const newProducts = [
    ['Cotton Bath Towel Set',15500,'Bathroom','Best Seller',45,true,U('towels .jpeg','towels 2.jpeg','towl 4.jpeg'),'Soft, highly absorbent cotton bath towels in a coordinated set — a Maxims home-goods staple.'],
    ['Throw Pillow Collection',28000,'Living Room','New Arrival',35,true,U('throw pillow 2.jpeg','throw pillow 4.jpeg','throw pillow 5.jpeg','throw pillow 6.jpeg'),'Curated throw pillows that bring texture and warmth to any sofa or bed.'],
    ['Colored Accent Cushions',19500,'Living Room',null,50,true,U('colored pillow 2.jpeg','colored pillow 3.jpeg','colored pillow 4.jpeg','colored pillow 5.jpeg','colored pillow 6.jpeg','colored pillow 7.jpeg','colored pillow 8.jpeg','different colored pillows.jpeg'),'A vibrant range of accent cushions in rich, liveable colours.'],
    ['Velvet Scatter Cushions',24000,'Living Room','Staff Pick',30,false,U('pillow 2.jpeg','pillow 3.jpeg','pillow 5.jpeg','pillow 6.jpeg','pillow 7.jpeg'),'Plush velvet scatter cushions with a refined, tactile finish.'],
    ['Plush Pillow Set (5pc)',26000,'Bedroom',null,40,false,U('pillow 8.jpeg','pillow 9.jpeg','pillow 10.jpeg','pillow 11.jpeg','pillow 12.jpeg','pillow 13.jpeg','pillow 14.jpeg','pillow.jpeg','pillows.jpeg'),'A comfortable five-piece plush pillow set for beds and lounge seating.'],
    ['Decorative Throw Blanket',22000,'Bedroom','New Arrival',25,false,U('blankets.jpeg','more pillows.jpeg'),'A cosy, beautifully finished throw blanket — an inviting final layer to any room.'],
  ]
  for (const [name,price,category,badge,stock_qty,is_featured,images,description] of newProducts) {
    if (!images.length) { console.log('  skip (no imgs)', name); continue }
    if (await Product.findOne({ name })) { console.log('  skip (exists)', name); continue }
    await Product.create({ name, slug:slug(name), price, category, badge, stock_qty, is_featured, status:'active', images, cover_image:images[0], description })
    console.log('  created product', name, images.length, 'imgs')
  }

  const newProjects = [
    ['Corporate Office Interior','Commercial','Abuja, FCT',2025,'large',true,U('office 1.jpeg','office 2.jpeg','office 3.jpeg','office 4.jpeg','office 5.jpeg','office 6.jpeg'),'A full corporate office fit-out by Maxims — warm, modern and built for elegant work.'],
    ['Maxims Home Goods Showroom','Commercial','Abuja, FCT',2025,'medium',true,U('for store 1.jpeg','for store 2.jpeg','for store 3.jpeg','for store 4.jpeg','items for store 1.jpeg','items for store all color.jpeg','items for store different color.jpeg','iitems for store .jpeg','instore item.jpeg','instore item 2.jpeg'),'A look inside the Maxims home-goods collection — cushions, towels, throws and curated accents.'],
  ]
  for (const [title,category,location,year,grid_size,is_featured,images,description] of newProjects) {
    if (!images.length) { console.log('  skip gallery (no imgs)', title); continue }
    if (await Gallery.findOne({ title })) { console.log('  skip gallery (exists)', title); continue }
    await Gallery.create({ title, slug:slug(title), category, location, year, grid_size, is_featured, is_published:true, images, cover_image:images[0], description })
    console.log('  created gallery', title, images.length, 'imgs')
  }
  console.log('DONE'); await mongoose.disconnect(); process.exit(0)
}
run().catch(e => { console.error(e); process.exit(1) })
