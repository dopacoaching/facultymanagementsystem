import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json } from '@/lib/auth'
import { Batch } from '@/lib/models/Batch'

/**
 * One-time migration: deactivate the "Feroke Girls IS" IS batch.
 * Call once as admin: GET /api/admin/migrate/deactivate-feroke-is
 * Delete this file after the migration is confirmed.
 */
export async function GET(req: NextRequest) {
  const auth = authenticate(req)
  if (auth instanceof NextResponse) return auth
  const denied = authorize(auth.payload, 'ADMIN')
  if (denied) return denied

  await connectDB()

  const result = await Batch.updateOne(
    { name: 'Feroke Girls IS', type: 'INTEGRATED_SCHOOL' },
    { $set: { isActive: false } },
  )

  if (result.matchedCount === 0) {
    return json({ message: 'Batch "Feroke Girls IS" not found — nothing to do.' })
  }
  return json({ message: 'Batch "Feroke Girls IS" deactivated.', modified: result.modifiedCount })
}
