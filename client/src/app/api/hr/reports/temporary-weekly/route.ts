import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { buildTemporaryReports } from '@/lib/services/weeklyReport'
import { sendReportTemplate, whatsappConfigured } from '@/lib/services/whatsapp'
import { parseLocalDate } from '@/lib/utils/dateRange'

const MAX_DAYS = 31
const MAX_RECIPIENTS = 100

function checkRange(from: string, to: string): string | null {
  const f = parseLocalDate(from), t = parseLocalDate(to)
  if (!f || !t || f > t) return 'from and to must be YYYY-MM-DD dates, from not after to'
  if ((t.getTime() - f.getTime()) / 86_400_000 > MAX_DAYS) return `Pick a range of at most ${MAX_DAYS} days`
  return null
}

/** GET /api/hr/reports/temporary-weekly?from=&to= — preview: each active temporary faculty, their hours and whether they can be messaged. */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth
    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') ?? '', to = searchParams.get('to') ?? ''
    const bad = checkRange(from, to)
    if (bad) return withToken(json({ error: bad }, 400), refreshedToken)

    await connectDB()
    const reports = await buildTemporaryReports(from, to)
    return withToken(json({
      from, to,
      configured: whatsappConfigured(),
      faculty: reports.map((r) => ({
        facultyId: r.facultyId, name: r.name, phone: r.phone, canSend: !!r.whatsappNumber,
        sessionCount: r.sessionCount, totalHours: r.totalHours, summary: r.params[2],
      })),
    }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/reports/temporary-weekly]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/hr/reports/temporary-weekly { from, to, facultyIds[] } — sends each selected faculty their report on WhatsApp. */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth
    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const body = await req.json() as { from?: string; to?: string; facultyIds?: unknown }
    const from = body.from ?? '', to = body.to ?? ''
    const bad = checkRange(from, to)
    if (bad) return withToken(json({ error: bad }, 400), refreshedToken)

    const ids = Array.isArray(body.facultyIds) ? Array.from(new Set(body.facultyIds.map(String))) : []
    if (ids.length === 0) return withToken(json({ error: 'Select at least one faculty member' }, 400), refreshedToken)
    if (ids.length > MAX_RECIPIENTS) return withToken(json({ error: `Send to at most ${MAX_RECIPIENTS} people at a time` }, 400), refreshedToken)
    if (ids.some((id) => !Types.ObjectId.isValid(id))) return withToken(json({ error: 'Invalid faculty id' }, 400), refreshedToken)
    if (!whatsappConfigured()) return withToken(json({ error: 'WhatsApp is not set up on the server yet' }, 503), refreshedToken)

    await connectDB()
    const reports = await buildTemporaryReports(from, to, ids)

    const results: { facultyId: string; name: string; status: 'SENT' | 'FAILED' | 'SKIPPED'; error?: string }[] = []
    for (const id of ids) {
      const r = reports.find((x) => x.facultyId === id)
      if (!r) { results.push({ facultyId: id, name: 'Unknown', status: 'SKIPPED', error: 'Not an active temporary faculty member' }); continue }
      if (!r.whatsappNumber) { results.push({ facultyId: id, name: r.name, status: 'SKIPPED', error: 'No valid phone number' }); continue }

      const sent = await sendReportTemplate(r.whatsappNumber, r.params)
      if (sent.ok) {
        results.push({ facultyId: id, name: r.name, status: 'SENT' })
        await writeAuditLog({
          category: 'HR', eventType: 'WEEKLY_REPORT_SENT',
          actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
          targetType: 'Faculty', targetId: id, targetName: r.name, facultyId: id, facultyName: r.name,
          description: `Report for ${from} to ${to} sent to ${r.name} on WhatsApp`,
          metadata: { from, to, sessionCount: r.sessionCount, totalHours: r.totalHours, messageId: sent.messageId },
        }).catch((e) => console.error('[audit WEEKLY_REPORT_SENT]', e))
      } else {
        results.push({ facultyId: id, name: r.name, status: 'FAILED', error: sent.error })
      }
    }
    return withToken(json({ results }), refreshedToken)
  } catch (err) {
    console.error('[POST /api/hr/reports/temporary-weekly]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
