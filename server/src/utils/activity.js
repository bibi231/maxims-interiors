// server/src/utils/activity.js
import { Activity } from '../models.js'

// Fire-and-forget audit logging. Never throws into the request path.
export async function logActivity({ userId, action, resourceType, resourceId, description }) {
  try {
    await Activity.create({
      user_id: userId, action, resource_type: resourceType,
      resource_id: resourceId ? String(resourceId) : undefined, description,
    })
  } catch (err) {
    console.error('[activity] log failed:', err.message)
  }
}
