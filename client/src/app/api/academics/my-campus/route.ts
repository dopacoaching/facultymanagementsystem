import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { activeTeacherNames, findIgPushCampus, findPushCampusByName } from '@/lib/services/pushCampuses'

/** GET /api/academics/my-campus — the signed-in campus login's name, teacher names and batch campus */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'CLASS_TEACHER', 'IG_CLASS_TEACHER')
    if (forbidden) return withToken(forbidden, refreshedToken)

    await connectDB()
    const campus = payload.role === 'IG_CLASS_TEACHER'
      ? await findIgPushCampus(payload.campusId)
      : await findPushCampusByName(payload.campusName)
    if (!campus) {
      return withToken(json({ error: 'Your account is not linked to an active campus' }, 404), refreshedToken)
    }
    return withToken(json({
      name: campus.name,
      kind: campus.kind,
      teachers: activeTeacherNames(campus),
      batchCampusId: campus.batchCampusId ? String(campus.batchCampusId) : null,
    }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/my-campus]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
