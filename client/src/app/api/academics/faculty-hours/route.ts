import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Faculty } from '@/lib/models/Faculty'
import { Session } from '@/lib/models/Session'
import { PermanentFacultyContract } from '@/lib/models/PermanentFacultyContract'
import { dayRangeFilter, toLocalISODate } from '@/lib/utils/dateRange'

/** GET /api/academics/faculty-hours?from=&to= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const now  = new Date()
    const from = searchParams.get('from') ?? toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1))
    const to   = searchParams.get('to')   ?? toLocalISODate(now)

    const range = dayRangeFilter(from, to)
    if (!range) {
      return withToken(json({ error: 'from and to must be YYYY-MM-DD dates' }, 400), refreshedToken)
    }

    await connectDB()

    const [facultyList, contracts, hoursAgg] = await Promise.all([
      Faculty.find({ isActive: true }).sort({ name: 1 }).lean(),
      PermanentFacultyContract.find({}).lean(),
      Session.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            sessionDate: range,
          },
        },
        {
          $group: {
            _id:          '$facultyId',
            totalHours:   { $sum: '$durationHours' },
            sessionCount: { $sum: 1 },
          },
        },
      ]),
    ])

    const contractMap = new Map(contracts.map((c) => [c.facultyId.toString(), c]))
    const hoursMap    = new Map(
      (hoursAgg as { _id: Types.ObjectId; totalHours: number; sessionCount: number }[])
        .map((h) => [h._id.toString(), h])
    )

    const result = facultyList.map((f) => {
      const contract     = contractMap.get(f._id.toString())
      const hours        = hoursMap.get(f._id.toString())
      const logged       = hours?.totalHours  ?? 0
      const sessionCount = hours?.sessionCount ?? 0
      const contractType = contract?.contractType ?? 'UNKNOWN'

      let quota: number | null = null
      if (contract) {
        quota = contract.monthlyHourQuota ?? contract.minHoursRequirement ?? contract.overtimeThresholdHours ?? null
      }

      const pct     = quota != null && quota > 0 ? Math.round((logged / quota) * 100) : null
      const deficit = quota != null ? Math.max(0, quota - logged) : null
      const surplus = quota != null ? Math.max(0, logged - quota) : null
      const status  = pct == null
        ? 'NO_QUOTA'
        : pct >= 100 ? 'MET' : pct >= 70 ? 'ON_TRACK' : pct >= 40 ? 'AT_RISK' : 'MISSED'

      return { facultyId: f._id, name: f.name, subject: f.subject, contractType, quota, logged, sessionCount, pct, deficit, surplus, status }
    })

    return withToken(json({ from, to, faculty: result }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/faculty-hours]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
