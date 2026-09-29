// server/src/utils/templates.js
// Branded transactional email HTML (inline styles for client safety).
export const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG')

export function emailShell({ heading, body, ctaLabel, ctaUrl, preheader }) {
  const year = new Date().getFullYear()
  const cta = ctaLabel && ctaUrl
    ? `<a href="${ctaUrl}" style="display:inline-block;background:#C9A84C;color:#1C0D35;text-decoration:none;font-family:Georgia,serif;font-weight:bold;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;padding:14px 28px;margin-top:8px;">${ctaLabel}</a>`
    : ''
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#1C0D35;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1C0D35;padding:32px 16px;"><tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;">
    <tr><td style="height:4px;background:#C9A84C;"></td></tr>
    <tr><td style="background:#1C0D35;padding:24px;" align="center">
      <div style="display:inline-block;width:44px;height:44px;border:1px solid #C9A84C;border-radius:50%;line-height:44px;color:#C9A84C;font-family:Georgia,serif;font-size:24px;">M</div>
      <div style="color:#FAF7F2;font-family:Georgia,serif;letter-spacing:6px;font-size:14px;margin-top:8px;">MAXIMS</div>
      <div style="color:#C9A84C;opacity:.6;font-family:Arial,sans-serif;letter-spacing:3px;font-size:9px;text-transform:uppercase;margin-top:2px;">Interiors &amp; Home Goods</div>
    </td></tr>
    <tr><td style="padding:36px 32px;font-family:Arial,sans-serif;color:#3D3B50;">
      <h1 style="font-family:Georgia,serif;color:#1C0D35;font-size:24px;font-weight:normal;margin:0 0 16px;">${heading}</h1>
      <div style="font-size:15px;line-height:1.65;">${body}</div>
      ${cta}
    </td></tr>
    <tr><td style="background:#1C0D35;padding:20px;" align="center">
      <div style="color:#C9A84C;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;">Where Luxury Meets Living</div>
      <div style="color:#FAF7F2;opacity:.4;font-family:Arial,sans-serif;font-size:10px;margin-top:6px;">© ${year} Maxims Interiors &amp; Home Goods · No. 8 Oke Agbe Street, Garki 2, Abuja, FCT</div>
    </td></tr>
  </table>
</td></tr></table></body></html>`
}

// Escape user-supplied text before it goes into an email body.
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// Two-column label/value table. Rows with empty values are skipped.
export function detailsTable(rows) {
  const tr = rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #eee;color:#6b6880;font-size:12px;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;color:#1C0D35;font-size:14px;">${esc(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${tr}</table>`
}

// Line items + totals. Items: [{ name, qty, price }].
export function itemsTable(items = [], { subtotal, deliveryFee, total } = {}) {
  if (!items.length) return ''
  const rows = items.map((i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:#3D3B50;">${esc(i.name)} <span style="color:#6b6880;">&times; ${Number(i.qty) || 1}</span></td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;color:#3D3B50;white-space:nowrap;">${naira((Number(i.price) || 0) * (Number(i.qty) || 1))}</td></tr>`).join('')
  const line = (label, val, strong) => `<tr><td style="padding:8px 0;${strong ? 'font-weight:bold;color:#1C0D35;' : 'color:#6b6880;'}font-size:14px;">${label}</td><td style="padding:8px 0;text-align:right;${strong ? 'font-weight:bold;color:#1C0D35;font-size:16px;' : 'color:#6b6880;font-size:14px;'}">${val}</td></tr>`
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}
    ${subtotal !== undefined ? line('Subtotal', naira(subtotal)) : ''}
    ${deliveryFee ? line('Delivery', naira(deliveryFee)) : ''}
    ${total !== undefined ? line('Estimated total', naira(total), true) : ''}</table>`
}

// Highlighted reference-number block for customer confirmations.
export function refBlock(label, ref) {
  return `<div style="background:#FAF7F2;border-left:3px solid #C9A84C;padding:14px 16px;margin:18px 0;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b6880;">${esc(label)}</div>
    <div style="font-family:Georgia,serif;font-size:22px;color:#1C0D35;margin-top:4px;letter-spacing:1px;">${esc(ref)}</div></div>`
}
