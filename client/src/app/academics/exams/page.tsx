'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Batch } from '@/services/faculty.service'

interface SuggestResponse {
  suggestion: {
    topic: string
    isPending: boolean
    case: number
    excluded: { chapterName: string; subject: string; reason: string }[]
  }
  bySubject: { subject: string; chapters: string[] }[]
}

const CASE_LABELS: Record<number, string> = {
  1: 'Case 1 — 2+ chapters, same subject',
  2: 'Case 2 — chapters from 2 subjects',
  3: 'Case 3 — single chapter',
  4: 'Case 4 — no eligible chapters',
}

export default function ExamTopicsPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [batches, setBatches]  = useState<Batch[]>([])
  const [batchId, setBatchId]  = useState('')
  const [examDate, setExamDate] = useState('')
  const [result, setResult]    = useState<SuggestResponse | null>(null)
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState('')

  useEffect(() => {
    if (!accessToken) return
    getBatches(accessToken).then((list) => {
      const ac = list.filter((b) => b.type !== 'INTEGRATED_SCHOOL')
      setBatches(ac)
      if (ac.length) setBatchId(ac[0]._id)
    }).catch(console.error)
  }, [accessToken])

  async function handleFetch() {
    if (!accessToken || !batchId || !examDate) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await apiFetch<SuggestResponse>(
        `/academics/exams/suggest?batchId=${batchId}&examDate=${examDate}`,
        { token: accessToken }
      )
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch suggestion')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Exam Topic Suggestion</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Auto-suggests exam topics based on completed chapters with a mandatory 1-day buffer.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="label">Batch</label>
            <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)} style={{ minWidth: 200 }}>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.type})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Exam Date</label>
            <input type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleFetch} disabled={loading || !batchId || !examDate}>
            {loading ? 'Fetching…' : '✨ Get Suggestion'}
          </button>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
          The 1-day buffer means chapters must be completed <strong>before midnight of the day before the exam</strong> to be eligible.
          Residential &amp; Online batches also require video to be marked complete.
        </p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <span className="alert-icon">⚠</span>{error}
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main suggestion */}
          <div className="card" style={{
            borderLeft: `4px solid ${result.suggestion.isPending ? 'var(--color-warning)' : 'var(--color-success)'}`,
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Suggested Topic</span>
              <span className={`badge ${result.suggestion.isPending ? 'badge-yellow' : 'badge-green'}`}>
                {result.suggestion.isPending ? '⏳ Pending' : '✓ Ready'}
              </span>
              <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                {CASE_LABELS[result.suggestion.case] ?? `Case ${result.suggestion.case}`}
              </span>
            </div>
            <div style={{
              fontSize: '1.0625rem',
              fontWeight: 600,
              color: result.suggestion.isPending ? 'var(--color-warning)' : 'var(--color-text)',
              padding: '0.75rem 1rem',
              background: result.suggestion.isPending ? 'rgba(245,158,11,.06)' : 'rgba(16,185,129,.06)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${result.suggestion.isPending ? 'rgba(245,158,11,.2)' : 'rgba(16,185,129,.2)'}`,
            }}>
              {result.suggestion.topic}
            </div>
          </div>

          {/* Eligible chapters by subject */}
          {result.bySubject.length > 0 && (
            <div className="card">
              <h3 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem' }}>Eligible Chapters</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {result.bySubject.map((s) => (
                  <div key={s.subject} style={{ padding: '0.625rem 0.875rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{s.subject}: </span>
                    {s.chapters.length === 0 ? (
                      <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>no eligible chapters</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                        {s.chapters.join(' · ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buffer-excluded chapters */}
          {result.suggestion.excluded.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--color-danger)' }}>
                🚫 Excluded by 1-Day Buffer
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {result.suggestion.excluded.map((ex, i) => (
                  <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', padding: '0.375rem 0' }}>
                    <span style={{ fontWeight: 500 }}>{ex.subject} — {ex.chapterName}</span>
                    <br />
                    <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>{ex.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
