'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { getBatches } from '@/services/faculty.service'
import type { Batch } from '@/services/faculty.service'
import { SkeletonCard, ErrorAlert } from '@/components/ui/Skeleton'
import { SUBJECTS, ProgressResponse, SubjectProgressSection } from '@/components/academics/syllabus-progress'

export default function SyllabusProgressPage() {
  const { accessToken, role, batchId: coordinatorBatchId } = useAppSelector((s) => s.auth)

  const [batches,   setBatches]   = useState<Batch[]>([])
  const [batchId,   setBatchId]   = useState('')
  const [data,      setData]      = useState<ProgressResponse | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const isCoordinator = role === 'COORDINATOR'

  useEffect(() => {
    if (!accessToken) { setLoading(false); return }
    getBatches(accessToken)
      .then((list) => {
        const ac = list.filter((b) => b.type !== 'IG')
        const visible = isCoordinator && coordinatorBatchId
          ? ac.filter((b) => b._id.toString() === coordinatorBatchId?.toString())
          : ac
        setBatches(visible)
        if (visible.length) setBatchId(visible[0]._id)
      })
      .catch(console.error)
  // coordinatorBatchId is stable (from JWT, only changes on re-login)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, coordinatorBatchId])

  useEffect(() => {
    if (!accessToken || !batchId) return
    setLoading(true)
    setError('')
    apiFetch<ProgressResponse>(`/academics/syllabus/progress/${batchId}`, { token: accessToken })
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [accessToken, batchId])

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Syllabus Progress</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Track each batch against the annual plan</p>
        </div>
        {batches.length > 1 && (
          <select
            className="sm:ml-auto border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          >
            {batches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      )}
      {error && (
        <ErrorAlert message={error} what="Failed to load syllabus progress" />
      )}

      {!loading && data && (
        <div className="space-y-8">
          {SUBJECTS.map((subj) => {
            const subjectProgress = data.progress[subj]
            if (!subjectProgress) return null
            return (
              <SubjectProgressSection key={subj} subject={subj} progress={subjectProgress} />
            )
          })}
        </div>
      )}

      {!loading && !data && !error && (
        <div className="text-center text-gray-400 py-12">Select a batch to view progress.</div>
      )}
    </div>
  )
}
