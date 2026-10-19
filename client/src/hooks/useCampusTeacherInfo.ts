import { useEffect, useState } from 'react'
import { getMyCampus } from '@/services/campus.service'
import { getBatches } from '@/services/faculty.service'

/** A class teacher's campus teacher names and batches, for the edit-own-entry form.
 *  Each is best-effort and independent: failing to load one never clears the other. */
export function useCampusTeacherInfo(accessToken: string | null | undefined) {
  const [teacherNames, setTeacherNames] = useState<string[]>([])
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([])

  useEffect(() => {
    if (!accessToken) return
    getMyCampus(accessToken).then((c) => {
      setTeacherNames(c.teachers)
      if (!c.batchCampusId) return
      getBatches(accessToken)
        .then((all) => setBatches(all.filter(
          (b) => (typeof b.campusId === 'object' ? b.campusId._id : b.campusId) === c.batchCampusId,
        )))
        .catch(() => setBatches([]))
    }).catch(() => setTeacherNames([]))
  }, [accessToken])

  return { teacherNames, batches }
}
