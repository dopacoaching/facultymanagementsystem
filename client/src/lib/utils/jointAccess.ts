import { JOINT_ENTRY_CAMPUS_LOGINS } from '@/lib/constants/jointCampuses'
import { resolveCoordinatorCampusName } from '@/lib/utils/coordinatorCampus'

export type JointAccess =
  | { kind: 'DEDICATED' }
  | { kind: 'CAMPUS'; campusName: string }

/** Who may use the repeaters Joint Class Entry: the dedicated joint-entry login, and the campus
 *  logins named in JOINT_ENTRY_CAMPUS_LOGINS (Studio). Null = not allowed. */
export async function jointAccessFor(payload: { userId?: string; role: string; campusName?: string; campusId?: string }): Promise<JointAccess | null> {
  if (payload.role === 'REPEATERS_JOINT_TEACHER') return { kind: 'DEDICATED' }
  if (payload.role === 'CLASS_TEACHER') {
    const campusName = await resolveCoordinatorCampusName(payload)
    if (campusName && (JOINT_ENTRY_CAMPUS_LOGINS as readonly string[]).includes(campusName)) return { kind: 'CAMPUS', campusName }
  }
  return null
}
