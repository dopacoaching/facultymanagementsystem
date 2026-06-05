import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { FacultyAvailability } from '@/lib/models/FacultyAvailability'
import { Faculty } from '@/lib/models/Faculty'

/** GET /api/academics/availability/all?month=M&year=Y */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const now   = new Date()
    const month = Number(searchParams.get('month') ?? now.getMonth() + 1)
    const year  = Number(searchParams.get('year')  ?? now.getFullYear())

    await connectDB()

    const startDate = new Date(year, month - 1, 1)
    const endDate   = new Date(year, month,     1)

    const [entries, faculty] = await Promise.all([
      FacultyAvailability.find({ date: { $gte: startDate, $lt: endDate } })
        .sort({ facultyId: 1, date: 1 })
        .lean(),
      Faculty.find({ isActive: true }).sort({ name: 1 }).lean(),
    ])

    const facultyMap = new Map(faculty.map((f) => [f._id.toString(), f]))

    const grouped = new Map<string, { facultyId: unknown; name: string; subject: string; entries: typeof entries }>()
    for (const entry of entries) {
      const fid = entry.facultyId.toString()
      const f   = facultyMap.get(fid)
      if (!f) continue
      if (!grouped.has(fid)) {
        grouped.set(fid, { facultyId: f._id, name: f.name, subject: f.subject, entries: [] })
      }
      grouped.get(fid)!.entries.push(entry)
    }

    return withToken(json({ month, year, faculty: Array.from(grouped.values()) }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/availability/all]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
