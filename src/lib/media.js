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
