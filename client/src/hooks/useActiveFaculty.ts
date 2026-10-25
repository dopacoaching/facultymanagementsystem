import { useEffect, useState } from 'react'
import { getAll } from '@/services/faculty.service'

/** Active faculty for the "who took the class" dropdown in the edit forms. */
export function useActiveFaculty(accessToken: string | null | undefined) {
  const [faculty, setFaculty] = useState<{ _id: string; name: string; subject: string; type: string }[]>([])
  useEffect(() => {
    if (!accessToken) return
    getAll(accessToken)
      .then((all) => setFaculty(all.filter((f) => f.isActive).map((f) => ({ _id: f._id, name: f.name, subject: f.subject, type: f.type }))))
      .catch(() => setFaculty([]))
  }, [accessToken])
  return faculty
}
