// src/lib/media.js
// Static brand media hosted on Cloudinary (uploaded from the studio's own photos/video).
// Centralised here so pages share the same assets and they're easy to swap later.

const CLD = 'https://res.cloudinary.com/dckmnbwcv'
const poster = (videoUrl) => videoUrl.replace('/video/upload/', '/video/upload/so_1/').replace(/\.mp4$/, '.jpg')

// ── Videos ──
export const OFFICE_VIDEO = `${CLD}/video/upload/v1782165325/maxims/video/pfs5vx7g35oukewtieje.mp4`
export const NEWLOOK_VIDEO = `${CLD}/video/upload/v1782225695/maxims/video/tf620p5gycackbqh6wsu.mp4`
export const REVEAL_VIDEO = `${CLD}/video/upload/v1782225673/maxims/video/iym79uy6uldqlsjfjsvk.mp4`
export const SITES_VIDEO = `${CLD}/video/upload/v1782225734/maxims/video/krlbaellk0afkfsjpdk1.mp4`

export const OFFICE_VIDEO_POSTER = poster(OFFICE_VIDEO)
export const NEWLOOK_VIDEO_POSTER = poster(NEWLOOK_VIDEO)
export const REVEAL_VIDEO_POSTER = poster(REVEAL_VIDEO)
export const SITES_VIDEO_POSTER = poster(SITES_VIDEO)

// All videos as a list (for the gallery / homepage film strip).
export const VIDEOS = [
  { src: NEWLOOK_VIDEO, poster: NEWLOOK_VIDEO_POSTER, title: 'A Space Transformed', tag: 'Interior Reveal' },
  { src: SITES_VIDEO, poster: SITES_VIDEO_POSTER, title: 'On Site', tag: 'Projects in Progress' },
  { src: REVEAL_VIDEO, poster: REVEAL_VIDEO_POSTER, title: 'The Reveal', tag: 'Finished Space' },
  { src: OFFICE_VIDEO, poster: OFFICE_VIDEO_POSTER, title: 'Inside the Studio', tag: 'Walk-through' },
]

// ── Team / studio photos ──
export const TEAM_PHOTOS = [
  `${CLD}/image/upload/v1782161768/maxims/team/ohfi82yl7o5ryvc6chkp.jpg`,
  `${CLD}/image/upload/v1782223902/maxims/team/lhtmnzef336gokkchsix.jpg`,
  `${CLD}/image/upload/v1782161779/maxims/team/nib59duhmaloxsxg149u.jpg`,
  `${CLD}/image/upload/v1782161936/maxims/team/qu7idvia3xkx7ivwk4oe.jpg`,
]

// ── Founder (Christine J-K Gadzama) ──
export const FOUNDER_PHOTO = `${CLD}/image/upload/v1782223902/maxims/team/g183xpc2phdhbej1neff.jpg`

// ── Lifestyle ──
export const SOFA_LIFESTYLE = `${CLD}/image/upload/v1782161751/maxims/catalog/awgzzv89oxtv0ejabfhr.jpg`

// ── Signature throw-pillow collections (portrait product reels) ──
export const COLLECTIONS = [
  { name: 'The Regal Collection',   price: 24000, slug: 'the-regal-collection',
    video: `${CLD}/video/upload/v1782921075/maxims/collections/vvdx3oriedwcz4h6alkn.mp4`,
    poster: `${CLD}/image/upload/v1782921078/maxims/collections/dvnbv0eoqmsuur6mnny0.jpg` },
  { name: 'Royal Nest Collection',  price: 22000, slug: 'royal-nest-collection',
    video: `${CLD}/video/upload/v1782935188/maxims/collections/rxgvwosi5vlch8imfeik.mp4`,
    poster: `${CLD}/image/upload/v1782921289/maxims/collections/maxpvgq4r9nyszxd4oiz.jpg` },
  { name: 'The Amani Collection',   price: 23000, slug: 'the-amani-collection',
    video: `${CLD}/video/upload/v1782935244/maxims/collections/yddkl6npmggwixtnedzc.mp4`,
    poster: `${CLD}/image/upload/v1782921290/maxims/collections/obd6lq4ezlm98uzckg6j.jpg` },
  { name: 'Willow Throw Pillow',    price: 25000, slug: 'willow-throw-pillow',
    video: `${CLD}/video/upload/v1782935709/maxims/collections/gnzvhnj6kc1z2pdppvnt.mp4`,
    poster: `${CLD}/image/upload/v1782921289/maxims/collections/fg2mhigvxbjaccz1q1km.jpg` },
  { name: 'The Opulence Collection', price: 26000, slug: 'the-opulence-collection',
    video: `${CLD}/video/upload/v1782935817/maxims/collections/kfe4prcjfy8hao3jg6yk.mp4`,
    poster: `${CLD}/image/upload/v1782921289/maxims/collections/lv6clccrlzu96z1rnmzo.jpg` },
  { name: 'Terra Collection',       price: 24000, slug: 'terra-collection',
    video: `${CLD}/video/upload/v1782935965/maxims/collections/n5wcsumb0p4bkxnunzds.mp4`,
    poster: `${CLD}/image/upload/v1782921289/maxims/collections/yg2pi4r6bkx2srdbjvbm.jpg` },
]

export const SPINSET_VIDEO = `${CLD}/video/upload/v1782935969/maxims/collections/htt0hu1mk2rljgo4tdlo.mp4`
export const SPINSET_POSTER = `${CLD}/image/upload/v1782921289/maxims/collections/syvqgzzkkrb59jaakv19.jpg`
