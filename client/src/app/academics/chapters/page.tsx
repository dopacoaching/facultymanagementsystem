'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Batch } from '@/services/faculty.service'
import { SkeletonTable, ErrorAlert, EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

interface BatchChapter {
  _id: string
  batchId: string
  subject: string
  chapterName: string
  chapterOrder: number
  videoComplete: boolean
  videoCompletedAt?: string
  facultyClassDone: boolean
  facultyClassDoneAt?: string
}

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function ChaptersPage() {
  const { accessToken, role, batchId: coordinatorBatchId } = useAppSelector((s) => s.auth)
  const toast = useToast()

  const [chapters, setChapters]     = useState<BatchChapter[]>([])
  const [batches, setBatches]       = useState<Batch[]>([])
  const [batchId, setBatchId]       = useState('')
  const [subjectFilter, setSubject] = useState('')
  const [loading, setLoading]       = useState(false)
  const [toggling, setToggling]     = useState<Record<string, boolean>>({})
  const [toggleError, setToggleError] = useState('')

  // COORDINATOR marks video-complete; managers can also do it as override. HR_MANAGER excluded
  // because the API (PATCH /academics/chapters/[id]) does not allow HR_MANAGER.
  const canMarkVideo = role === 'COORDINATOR' || role === 'ACADEMICS_MANAGER' || role === 'ADMIN'
  // Only managers can manually override the facultyClassDone flag (auto-set by session logging)
  const canMarkClass = role === 'ACADEMICS_MANAGER' || role === 'ADMIN' || role === 'HR_MANAGER'

  const isCoordinator = role === 'COORDINATOR'

  useEffect(() => {
    if (!accessToken) return
    getBatches(accessToken).then((list) => {
      const ac = list.filter((b) => b.type !== 'IG')
      // Coordinators can only see and act on their assigned batch
      const visible = isCoordinator && coordinatorBatchId
        ? ac.filter((b) => b._id === coordinatorBatchId)
        : ac
      setBatches(visible)
      if (visible.length) setBatchId(visible[0]._id)
    }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !batchId) return
    setLoading(true)
    const url = `/academics/chapters?batchId=${batchId}`
    apiFetch<BatchChapter[]>(url, { token: accessToken })
      .then(setChapters)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken, batchId])

  const subjects = useMemo(() => [...new Set(chapters.map((c) => c.subject))].sort(), [chapters])

  const filtered = useMemo(() => {
    if (!subjectFilter) return chapters
    return chapters.filter((c) => c.subject === subjectFilter)
  }, [chapters, subjectFilter])

  async function toggleField(id: string, field: 'videoComplete' | 'facultyClassDone', current: boolean) {
    if (!accessToken) return
    setToggling((t) => ({ ...t, [id]: true }))
    try {
      const updated = await apiFetch<BatchChapter>(`/academics/chapters/${id}`, {
        method: 'PATCH',
        token: accessToken,
        body: { [field]: !current },
      })
      setChapters((prev) => prev.map((c) => c._id === id ? updated : c))
      toast.success('Updated', field === 'videoComplete' ? 'Video status updated.' : 'Class status updated.')
    } catch (e: unknown) {
      setToggleError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setToggling((t) => ({ ...t, [id]: false }))
    }
  }

  const videoCount  = chapters.filter((c) => c.videoComplete).length
  const classCount  = chapters.filter((c) => c.facultyClassDone).length
  const totalCount  = chapters.length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Chapter Progress</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Track video-complete and faculty class status per chapter
          </p>
        </div>
      </div>

      {toggleError && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={toggleError} onRetry={() => setToggleError('')} />
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Batch</label>
            <select className="input" value={batchId}
              onChange={(e) => { setBatchId(e.target.value); setSubject('') }}
              style={{ minWidth: 200 }}
              disabled={isCoordinator}>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Subject</label>
            <select className="input" value={subjectFilter} onChange={(e) => setSubject(e.target.value)} style={{ minWidth: 150 }}>
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {subjectFilter && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSubject('')}>Clear</button>
          )}
        </div>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      {totalCount > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Chapters', value: totalCount, color: 'var(--color-text-secondary)' },
            { label: 'Video Complete', value: videoCount, color: 'var(--color-success)' },
            { label: 'Faculty Class Done', value: classCount, color: 'var(--color-primary)' },
            { label: 'Pending Video', value: totalCount - videoCount, color: 'var(--color-warning)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ flex: '1 1 140px', padding: '0.875rem 1.125rem', textAlign: 'center', minWidth: 0 }}>
              <div style={{ fontSize: '1.625rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="card">
        {loading ? (
          <SkeletonTable rows={7} cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📚"
            title={totalCount === 0 ? 'No chapters seeded for this batch' : 'No chapters match the filter'}
            description={totalCount === 0
              ? 'Chapters are created automatically when sessions are logged. Log a session to get started.'
              : 'Try selecting a different subject from the filter above.'}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th style={{ textAlign: 'center' }}>🎬 Video</th>
                  <th style={{ textAlign: 'center', fontSize: '0.75rem' }}>Video Date</th>
                  <th style={{ textAlign: 'center' }}>📖 Class</th>
                  <th style={{ textAlign: 'center', fontSize: '0.75rem' }}>Class Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ch) => (
                  <tr key={ch._id}>
                    <td style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', width: 40 }}>{ch.chapterOrder || '—'}</td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{ch.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{ch.chapterName}</td>

                    {/* Video Complete */}
                    <td style={{ textAlign: 'center' }}>
                      {canMarkVideo ? (
                        <button
                          className={`btn btn-sm ${ch.videoComplete ? 'btn-success' : 'btn-outline'}`}
                          style={{ minWidth: 72, fontSize: '0.75rem' }}
                          disabled={toggling[ch._id]}
                          onClick={() => toggleField(ch._id, 'videoComplete', ch.videoComplete)}
                          title={ch.videoComplete ? 'Mark video as not complete' : 'Mark video as complete'}
                        >
                          {toggling[ch._id] ? '…' : ch.videoComplete ? '✓ Done' : 'Pending'}
                        </button>
                      ) : (
                        <span className={`badge ${ch.videoComplete ? 'badge-green' : 'badge-yellow'}`}>
                          {ch.videoComplete ? 'Done' : 'Pending'}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                      {fmt(ch.videoCompletedAt)}
                    </td>

                    {/* Faculty Class Done */}
                    <td style={{ textAlign: 'center' }}>
                      {canMarkClass ? (
                        <button
                          className={`btn btn-sm ${ch.facultyClassDone ? 'btn-primary' : 'btn-outline'}`}
                          style={{ minWidth: 72, fontSize: '0.75rem' }}
                          disabled={toggling[ch._id]}
                          onClick={() => toggleField(ch._id, 'facultyClassDone', ch.facultyClassDone)}
                          title={ch.facultyClassDone ? 'Mark class as not done (manager override)' : 'Mark class as done'}
                        >
                          {toggling[ch._id] ? '…' : ch.facultyClassDone ? '✓ Done' : 'Pending'}
                        </button>
                      ) : (
                        <span className={`badge ${ch.facultyClassDone ? 'badge-blue' : 'badge-gray'}`}>
                          {ch.facultyClassDone ? 'Done' : 'Pending'}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                      {fmt(ch.facultyClassDoneAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canMarkVideo && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
          💡 Mark chapters as <strong>Video Complete</strong> before logging Residential or Online sessions — the system enforces a video-first rule.
        </p>
      )}
    </div>
  )
}
