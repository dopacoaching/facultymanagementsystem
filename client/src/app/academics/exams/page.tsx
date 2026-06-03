'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Batch } from '@/services/faculty.service'

interface Schedule {
  _id: string
  weekStartDate: string
  weekEndDate: string
  mondayExamTopic?: string
  fridayExamTopic?: string
  isPublished: boolean
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function ExamTopicsPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [batches,   setBatches]   = useState<Batch[]>([])
  const [batchId,   setBatchId]   = useState('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    if (!accessToken) return
    getBatches(accessToken).then((list) => {
      const ac = list.filter((b) => b.type !== 'IG')
      setBatches(ac)
      if (ac.length) setBatchId(ac[0]._id)
    }).catch(console.error)
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !batchId) return
    setLoading(true)
    apiFetch<Schedule[]>(`/academics/schedules?batchId=${batchId}`, { token: accessToken })
      .then((data) => setSchedules(data.filter((s) => s.mondayExamTopic || s.fridayExamTopic)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken, batchId])

  const withTopics = schedules
    .slice()
    .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Exam Topics</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Scheduled exam topics from published weekly schedules.
          </p>
        </div>
        <select
          className="input"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          style={{ minWidth: 200 }}
        >
          {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {loading && <div style={{ color: 'var(--color-muted)', padding: '2rem 0' }}>Loading…</div>}

      {!loading && withTopics.length === 0 && (
        <div className="card" style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '3rem' }}>
          No exam topics scheduled yet for this batch.
        </div>
      )}

      {!loading && withTopics.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {withTopics.map((s) => (
            <div key={s._id} className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 160, flexShrink: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Week</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {fmt(s.weekStartDate)} – {fmt(s.weekEndDate)}
                </div>
                {!s.isPublished && (
                  <span className="badge badge-yellow" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>Draft</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', flex: 1 }}>
                {s.mondayExamTopic && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Monday Exam</div>
                    <div style={{ fontWeight: 500 }}>{s.mondayExamTopic}</div>
                  </div>
                )}
                {s.fridayExamTopic && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Friday Exam</div>
                    <div style={{ fontWeight: 500 }}>{s.fridayExamTopic}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
