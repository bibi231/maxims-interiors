// server/src/utils/staffInvite.js
// Password set-up links for staff accounts created without a password.
// Same token format as routes/auth.js (purpose 'pwreset' + password_version),
// so /admin/reset-password accepts it and it is single-use.
import jwt from 'jsonwebtoken'
import { sendMail } from './mailer.js'
import { emailShell, esc } from './templates.js'
import { appUrl } from './notify.js'

export function setupLink(user, hours = 72) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set')
  const token = jwt.sign({ id: user.id, pv: user.password_version || 0, purpose: 'pwreset' }, process.env.JWT_SECRET, { expiresIn: `${hours}h` })
  return `${appUrl()}/admin/reset-password?token=${encodeURIComponent(token)}&welcome=1`
}

/** Emails the set-up link (default 72h). Resolves true if the mail was accepted. */
export function sendSetupEmail(user, { hours = 72 } = {}) {
  const loginUrl = `${appUrl()}/admin/login`
  return sendMail({
    to: user.email,
    subject: 'Your Maxims admin account is ready',
    html: emailShell({
      heading: `Welcome to Maxims, ${esc(String(user.full_name).split(' ')[0])}`,
      body: `<p>A staff account has been set up for you on the Maxims Interiors admin.</p>
        <p><strong>Sign-in email:</strong> ${esc(user.email)}<br><strong>Role:</strong> ${esc(String(user.role).replace(/_/g, ' '))}</p>
        <p>Use the button below to choose your password. The link is valid for ${hours} hours and works once.</p>
        <p style="font-size:13px;color:#6b6880;">Admin sign-in page: <a href="${loginUrl}" style="color:#1C0D35;">${loginUrl}</a></p>`,
      ctaLabel: 'Set my password', ctaUrl: setupLink(user, hours),
    }),
  })
}
