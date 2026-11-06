'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { getBatches } from '@/services/faculty.service'
import type { Batch } from '@/services/faculty.service'
import { SkeletonCard, ErrorAlert } from '@/components/ui/Skeleton'
import { SUBJECTS, ProgressResponse, SubjectProgressSection } from '@/components/academics/syllabus-progress'
import s from '@/components/academics/syllabus-progress/Progress.module.css'

export default function SyllabusProgressPage() {
  const { accessToken, role, batchId: coordinatorBatchId } = useAppSelector((s) => s.auth)

  const [batches,   setBatches]   = useState<Batch[]>([])
  const [batchId,   setBatchId]   = useState('')
  const [data,      setData]      = useState<ProgressResponse | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const isCoordinator = role === 'CLASS_TEACHER'

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
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Syllabus Progress</h1>
          <p className="page-subtitle">Track each batch against the annual plan</p>
        </div>
      </div>

      {batches.length > 1 && (
        <div className="toolbar">
          <div className="form-group">
            <label className="label" htmlFor="progress-batch">Batch</label>
            <select
              id="progress-batch"
              className={`input ${s.batchSelect}`}
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            >
              {batches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading && (
        <div className="stack-sm" aria-busy="true">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      )}
      {error && (
        <ErrorAlert message={error} what="Failed to load syllabus progress" />
      )}

      {!loading && data && (
        <div className={s.sections} aria-live="polite">
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
        <div className="card">
          <div className="empty-state">
            <h3>No batch selected</h3>
            <p>Select a batch to view progress.</p>
          </div>
        </div>
      )}
    </div>
  )
}
