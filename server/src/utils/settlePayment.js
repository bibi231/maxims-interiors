// server/src/utils/settlePayment.js
// The ONLY place a payment becomes "paid". Called after a gateway-verified
// result (signed webhook or server-to-server verify). Idempotent per
// transaction reference: the status flip is one conditional UPDATE, so a
// webhook and a verify-on-return racing each other settle the order once.
import { query } from '../config/db.js'
import { Transaction, Order } from '../models.js'
import { toKobo } from './payments.js'
import { sendMail } from './mailer.js'
import { emailShell, esc, naira, refBlock } from './templates.js'
import { notifyStaff } from './notify.js'
import { logActivity } from './activity.js'

// Orders in these states move to 'paid' when a payment settles.
const PAYABLE_STATUSES = ['new', 'contacted', 'awaiting_payment', 'pending', 'processing']

/**
 * result: { status: 'success'|'failed'|'pending', amountKobo, currency, channel, gatewayResponse }
 * source: 'webhook' | 'verify'
 * Returns { status, settledNow, reason? }
 */
export async function applyGatewayResult(txn, result, source) {
  if (txn.status === 'success') return { status: 'success', settledNow: false }

  if (result.status === 'success') {
    const expected = toKobo(txn.amount)
    const currencyOk = !result.currency || String(result.currency).toUpperCase() === 'NGN'
    if (result.amountKobo !== expected || !currencyOk) {
      // Paid, but not what we asked for: do not mark paid; staff review.
      await query('UPDATE `transactions` SET `gateway_response` = ?, `updated_at` = ? WHERE `id` = ? AND `status` <> \'success\'',
        [`Amount/currency mismatch from ${source}: got ${result.amountKobo} kobo ${result.currency || ''}, expected ${expected} kobo NGN`, new Date(), txn.id])
      console.error(`[payments] ${txn.reference}: amount mismatch (${result.amountKobo} vs ${expected})`)
      return { status: 'pending', settledNow: false, reason: 'amount_mismatch' }
    }
    const now = new Date()
    const r = await query(
      'UPDATE `transactions` SET `status` = \'success\', `paid_at` = ?, `channel` = COALESCE(?, `channel`), `gateway_response` = ?, `updated_at` = ? WHERE `id` = ? AND `status` <> \'success\'',
      [now, result.channel || null, String(result.gatewayResponse || `verified by ${source}`).slice(0, 500), now, txn.id],
    )
    if (!r.affectedRows) return { status: 'success', settledNow: false } // someone else settled it first
    const fresh = await Transaction.findById(txn.id)
    await markOrderPaid(fresh, source)
    return { status: 'success', settledNow: true }
  }

  if (result.status === 'failed') {
    await query('UPDATE `transactions` SET `status` = \'failed\', `gateway_response` = ?, `updated_at` = ? WHERE `id` = ? AND `status` = \'pending\'',
      [String(result.gatewayResponse || 'failed').slice(0, 500), new Date(), txn.id])
    return { status: 'failed', settledNow: false }
  }
  return { status: 'pending', settledNow: false }
}

async function markOrderPaid(txn, source) {
  if (!txn.order_id) return
  const order = await Order.findById(txn.order_id)
  if (!order) return
  order.payment_status = 'paid'
  order.payment_ref = txn.reference
  order.payment_method = txn.provider
  if (PAYABLE_STATUSES.includes(order.status)) {
    order.status = 'paid'
    order.status_history.push({ status: 'paid', author_name: `${txn.provider === 'paystack' ? 'Paystack' : 'Squad'} payment (${source})` })
  }
  await order.save()
  await logActivity({ action: 'status_changed', resourceType: 'order', resourceId: order.id, description: `${order.order_number} paid online: ${naira(txn.amount)} (ref ${txn.reference})` })

  sendMail({
    to: order.customer_email,
    replyTo: process.env.MAIL_REPLY_TO || 'info@maximsinterior.com.ng',
    subject: `Payment received for ${order.order_number} - Maxims Interiors`,
    html: emailShell({
      heading: 'Payment received',
      body: `<p>Dear ${esc(String(order.customer_name).split(' ')[0])},</p>
        <p>Thank you. We have received your payment of <strong>${naira(txn.amount)}</strong> for ${order.kind === 'quote' ? 'quote' : 'order'} ${esc(order.order_number)}. Our team will contact you to arrange the next steps.</p>
        ${refBlock('Payment reference', txn.reference)}`,
    }),
  })
  notifyStaff({
    subject: `Paid: ${order.order_number} (${naira(txn.amount)})`,
    heading: 'Online payment received',
    adminPath: '/admin/orders',
    body: `<p>${esc(order.customer_name)} paid <strong>${naira(txn.amount)}</strong> for ${esc(order.order_number)} (payment reference ${esc(txn.reference)}, confirmed by ${source}).</p>`,
  })
}
