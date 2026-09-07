import { redirect } from 'next/navigation'

/** Weekly Schedule moved to the standalone /scheduling route (Repeaters + IG). */
export default function AcademicsScheduleRedirect() {
  redirect('/scheduling')
}
