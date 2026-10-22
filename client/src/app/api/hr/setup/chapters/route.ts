import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { ChapterOption } from '@/lib/models/ChapterOption'
import { chapterSubjectOf } from '@/lib/constants/labSubjects'
import { writeAuditLog } from '@/lib/services/salary/audit'

const MAX_BULK = 200

/** GET /api/hr/setup/chapters?subject=PSYCHOLOGY — chapters HR/Admin added for a subject */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const raw = new URL(req.url).searchParams.get('subject')
    if (!raw?.trim()) return withToken(json({ error: 'subject query parameter is required' }, 400), refreshedToken)
    const subject = chapterSubjectOf(raw)

    await connectDB()
    const chapters = await ChapterOption.find({ subject }).sort({ createdAt: 1 }).lean()
    return withToken(json(chapters), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/setup/chapters]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/hr/setup/chapters — Body: { subject, names: string[] }. Names already on the
 *  subject (any casing) are skipped. */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const body = await req.json() as Record<string, unknown>
    const subject = typeof body.subject === 'string' ? chapterSubjectOf(body.subject) : ''
    if (subject.length < 2 || subject.length > 40) {
      return withToken(json({ error: 'Select a subject' }, 400), refreshedToken)
    }
    if (!Array.isArray(body.names)) {
      return withToken(json({ error: 'names must be a list of chapter names' }, 400), refreshedToken)
    }
    const seen = new Set<string>()
    const names: string[] = []
    for (const n of body.names) {
      if (typeof n !== 'string') continue
      const name = n.trim().replace(/\s+/g, ' ')
      if (!name || seen.has(name.toLowerCase())) continue
      if (name.length > 120) {
        return withToken(json({ error: 'A chapter name can be at most 120 characters' }, 400), refreshedToken)
      }
      seen.add(name.toLowerCase())
      names.push(name)
    }
    if (names.length === 0) return withToken(json({ error: 'Enter at least one chapter name' }, 400), refreshedToken)
    if (names.length > MAX_BULK) {
      return withToken(json({ error: `Add at most ${MAX_BULK} chapters at a time` }, 400), refreshedToken)
    }

    await connectDB()
    const existing = new Set(
      (await ChapterOption.find({ subject, key: { $in: names.map((n) => n.toLowerCase()) } }).select('key').lean()).map((c) => c.key),
    )
    const fresh = names.filter((n) => !existing.has(n.toLowerCase()))
    if (fresh.length) {
      try {
        await ChapterOption.insertMany(fresh.map((name) => ({ subject, name, key: name.toLowerCase() })), { ordered: false })
      } catch (e) {
        // A duplicate added by someone else a moment ago is fine; anything else is not.
        const err = e as { code?: number; writeErrors?: unknown[] }
        if (err.code !== 11000 && !err.writeErrors) throw e
      }
      writeAuditLog({
        category: 'ACADEMICS', eventType: 'CHAPTER_UPDATED',
        actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
        targetType: 'ChapterOption', targetName: subject,
        description: `Chapters added to ${subject}: ${fresh.join(', ')}`,
        metadata: { subject, added: fresh },
      }).catch(() => null)
    }

    return withToken(json({ added: fresh.length, skipped: names.length - fresh.length }, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/hr/setup/chapters]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
