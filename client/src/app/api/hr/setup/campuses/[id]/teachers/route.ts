import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { PushCampus } from '@/lib/models/PushCampus'
import { writeAuditLog } from '@/lib/services/salary/audit'

async function load(req: NextRequest, params: Promise<{ id: string }>) {
  const auth = authenticate(req)
  if (auth instanceof NextResponse) return { error: auth }
  const { payload, refreshedToken } = auth
  const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
  if (forbidden) return { error: withToken(forbidden, refreshedToken) }

  const { id } = await params
  if (!Types.ObjectId.isValid(id)) return { error: withToken(json({ error: 'Invalid campus id' }, 400), refreshedToken) }
  await connectDB()
  const campus = await PushCampus.findById(id)
  if (!campus) return { error: withToken(json({ error: 'Campus not found' }, 404), refreshedToken) }
  return { payload, refreshedToken, campus }
}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '')

/** POST /api/hr/setup/campuses/:id/teachers — add a teacher name. Body: { name } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await load(req, params)
    if ('error' in r) return r.error
    const { payload, refreshedToken, campus } = r

    const name = clean((await req.json()).name)
    if (name.length < 2 || name.length > 60) {
      return withToken(json({ error: 'Teacher name must be 2–60 characters' }, 400), refreshedToken)
    }
    const existing = campus.teachers.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (existing.isActive) return withToken(json({ error: 'This teacher is already listed for the campus.' }, 409), refreshedToken)
      existing.isActive = true // adding a removed teacher again simply brings them back
    } else {
      campus.teachers.push({ name, isActive: true })
    }
    await campus.save()

    await writeAuditLog({
      category: 'ADMIN', eventType: 'USER_ACCOUNT_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Campus', targetId: String(campus._id), targetName: campus.name,
      description: `Teacher "${name}" added to ${campus.name}`,
    })
    return withToken(json({ teachers: campus.teachers }, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/hr/setup/campuses/:id/teachers]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/hr/setup/campuses/:id/teachers — rename or (de)activate a teacher.
 * Body: { name, newName?, isActive? }. Past entries keep the name they were saved with.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await load(req, params)
    if ('error' in r) return r.error
    const { payload, refreshedToken, campus } = r

    const body = await req.json() as Record<string, unknown>
    const name = clean(body.name)
    const teacher = campus.teachers.find((t) => t.name === name)
    if (!teacher) return withToken(json({ error: 'Teacher not found' }, 404), refreshedToken)

    const changes: string[] = []
    if (body.newName !== undefined) {
      const newName = clean(body.newName)
      if (newName.length < 2 || newName.length > 60) {
        return withToken(json({ error: 'Teacher name must be 2–60 characters' }, 400), refreshedToken)
      }
      if (newName !== teacher.name) {
        if (campus.teachers.some((t) => t !== teacher && t.name.toLowerCase() === newName.toLowerCase())) {
          return withToken(json({ error: 'Another teacher already has that name.' }, 409), refreshedToken)
        }
        changes.push(`renamed "${teacher.name}" → "${newName}"`)
        teacher.name = newName
      }
    }
    if (typeof body.isActive === 'boolean' && body.isActive !== teacher.isActive) {
      teacher.isActive = body.isActive
      changes.push(`${teacher.name} ${body.isActive ? 'activated' : 'deactivated'}`)
    }
    if (changes.length) {
      await campus.save()
      await writeAuditLog({
        category: 'ADMIN', eventType: 'USER_ACCOUNT_UPDATED',
        actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
        targetType: 'Campus', targetId: String(campus._id), targetName: campus.name,
        description: `Teachers of ${campus.name}: ${changes.join('; ')}`,
      })
    }
    return withToken(json({ teachers: campus.teachers }), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/hr/setup/campuses/:id/teachers]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
