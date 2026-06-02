import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { User } from '@server/models/User'
import { RefreshToken } from '@server/models/RefreshToken'
import { validatePasswordComplexity } from '@server/utils/passwordUtils'

export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { currentPassword, newPassword, userId: targetUserId } = await req.json()

    const pwError = validatePasswordComplexity(newPassword)
    if (pwError) return withToken(json({ error: pwError }, 400), refreshedToken)

    await connectDB()

    // HR_MANAGER and ADMIN can change any user's password; others are restricted to their own
    const canChangeOthers = payload.role === 'HR_MANAGER' || payload.role === 'ADMIN'
    const resolvedUserId = canChangeOthers && targetUserId ? targetUserId : payload.userId

    const user = await User.findById(resolvedUserId)
    if (!user) return withToken(json({ error: 'User not found' }, 404), refreshedToken)

    // If changing own password, require current password verification
    if (resolvedUserId === payload.userId) {
      if (!currentPassword) {
        return withToken(
          json({ error: 'currentPassword is required to change your own password' }, 400),
          refreshedToken,
        )
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!valid) {
        return withToken(json({ error: 'Current password is incorrect' }, 401), refreshedToken)
      }
    }

    const salt = await bcrypt.genSalt(12)
    user.passwordHash = await bcrypt.hash(newPassword, salt)
    await user.save()

    // Invalidate all existing refresh tokens for this user so other devices are signed out
    await RefreshToken.deleteMany({ userId: user._id })

    return withToken(json({ success: true, message: 'Password changed successfully' }), refreshedToken)
  } catch (err) {
    console.error('[POST /api/auth/change-password]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
