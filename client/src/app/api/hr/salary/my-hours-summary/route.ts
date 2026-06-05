import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'

/** GET /api/hr/salary/my-hours-summary — faculty sees their own monthly class hours (last 12 months) */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'FACULTY')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const facultyId = payload.facultyId
    if (!facultyId) {
      return withToken(json({ error: 'Faculty account not linked to a faculty profile' }, 403), refreshedToken)
    }

    await connectDB()

    const cutoff = new Date()
    cutoff.setDate(1)
    cutoff.setMonth(cutoff.getMonth() - 11)
    cutoff.setHours(0, 0, 0, 0)

    const agg = await Session.aggregate([
      {
        $match: {
          facultyId: new Types.ObjectId(facultyId),
          status:    'COMPLETED',
          sessionDate: { $gte: cutoff },
        },
      },
      {
        $group: {
          _id:          { year: { $year: '$sessionDate' }, month: { $month: '$sessionDate' } },
          totalHours:   { $sum: '$durationHours' },
          sessionCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ])

    const result = agg.map((row: { _id: { year: number; month: number }; totalHours: number; sessionCount: number }) => ({
      year:         row._id.year,
      month:        row._id.month,
      totalHours:   row.totalHours,
      sessionCount: row.sessionCount,
    }))

    return withToken(json(result), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/salary/my-hours-summary]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
