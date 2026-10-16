import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { ChapterOption } from '@/lib/models/ChapterOption'

/** GET /api/academics/chapter-options?subject=PSYCHOLOGY — chapter names HR/Admin added
 *  for a subject. Read by every signed-in role so the Push Board can offer them. */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { refreshedToken } = auth

    const subject = new URL(req.url).searchParams.get('subject')?.trim().toUpperCase()
    if (!subject) return withToken(json({ error: 'subject query parameter is required' }, 400), refreshedToken)

    await connectDB()
    const rows = await ChapterOption.find({ subject }).select('name').sort({ createdAt: 1 }).lean()
    return withToken(json(rows.map((r) => r.name)), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/chapter-options]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
