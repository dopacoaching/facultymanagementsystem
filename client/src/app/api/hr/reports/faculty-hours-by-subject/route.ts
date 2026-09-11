import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { Faculty } from '@/lib/models/Faculty'
import { dayRangeFilter } from '@/lib/utils/dateRange'

interface SubjectRanking {
  subject: string
  faculty: {
    facultyId: string
    name: string
    type: string
    totalHours: number
    sessionCount: number
  }[]
}

/** GET /api/hr/reports/faculty-hours-by-subject?from=&to= — ranks faculty by hours taught, per subject */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') ?? undefined
    const to   = searchParams.get('to')   ?? undefined

    const dateFilter: Record<string, unknown> = { status: 'COMPLETED' }
    if (from && to) {
      const range = dayRangeFilter(from, to)
      if (!range) {
        return withToken(json({ error: 'from and to must be YYYY-MM-DD dates' }, 400), refreshedToken)
      }
      dateFilter.sessionDate = range
    }

    await connectDB()

    const [agg, facultyList] = await Promise.all([
      Session.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id:          { subject: '$subject', facultyId: '$facultyId' },
            totalHours:   { $sum: '$durationHours' },
            sessionCount: { $sum: 1 },
          },
        },
      ]),
      Faculty.find({}).select('name type').lean(),
    ])

    const facultyMap = new Map(facultyList.map((f) => [f._id.toString(), f]))

    const bySubject = new Map<string, SubjectRanking['faculty']>()
    for (const row of agg as { _id: { subject: string; facultyId: import('mongoose').Types.ObjectId }; totalHours: number; sessionCount: number }[]) {
      const facultyId = row._id.facultyId.toString()
      const fac = facultyMap.get(facultyId)
      if (!fac) continue // faculty deleted since session was logged
      const subject = row._id.subject
      const list = bySubject.get(subject) ?? []
      list.push({
        facultyId,
        name:         fac.name,
        type:         fac.type,
        totalHours:   row.totalHours,
        sessionCount: row.sessionCount,
      })
      bySubject.set(subject, list)
    }

    const result: SubjectRanking[] = Array.from(bySubject.entries())
      .map(([subject, faculty]) => ({
        subject,
        faculty: faculty.sort((a, b) => b.totalHours - a.totalHours),
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject))

    return withToken(json({ from: from ?? null, to: to ?? null, subjects: result }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/reports/faculty-hours-by-subject]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
