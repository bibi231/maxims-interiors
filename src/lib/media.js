// src/lib/media.js
// Static brand media hosted on Cloudinary (uploaded from the studio's own photos/video).
// Centralised here so pages share the same assets and they're easy to swap later.

const CLD = 'https://res.cloudinary.com/dckmnbwcv'

// Office walk-through video (compressed for web) + an auto-generated poster frame.
export const OFFICE_VIDEO = `${CLD}/video/upload/v1782165325/maxims/video/pfs5vx7g35oukewtieje.mp4`
export const OFFICE_VIDEO_POSTER = `${CLD}/video/upload/so_3/v1782165325/maxims/video/pfs5vx7g35oukewtieje.jpg`

// Team / studio photos (people in Maxims aprons + sourcing trips).
export const TEAM_PHOTOS = [
  `${CLD}/image/upload/v1782161768/maxims/team/ohfi82yl7o5ryvc6chkp.jpg`,
  `${CLD}/image/upload/v1782161779/maxims/team/nib59duhmaloxsxg149u.jpg`,
  `${CLD}/image/upload/v1782161936/maxims/team/qu7idvia3xkx7ivwk4oe.jpg`,
]

// Candidate founder / sourcing portrait (a solo shot curating homeware).
export const FOUNDER_PHOTO = `${CLD}/image/upload/v1782161758/maxims/team/dbo6hwy4rbuymnebhuqz.jpg`

// Lifestyle shot — throw pillows styled on a sofa.
export const SOFA_LIFESTYLE = `${CLD}/image/upload/v1782161751/maxims/catalog/awgzzv89oxtv0ejabfhr.jpg`
