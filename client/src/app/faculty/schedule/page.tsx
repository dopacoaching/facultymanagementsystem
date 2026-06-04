import { redirect } from 'next/navigation'

/** /faculty/schedule was merged into /faculty/sessions */
export default function FacultyScheduleRedirect() {
  redirect('/faculty/sessions')
}
