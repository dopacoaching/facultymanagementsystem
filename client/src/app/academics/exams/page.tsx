'use client'
import { useEffect, useState, useCallback } from 'react'
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
  batchId: string | { _id: string; name: string }
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function ExamTopicsPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const canEdit = role === 'ADMIN' || role === 'HR_MANAGER' || role === 'ACADEMICS_MANAGER' || role === 'COORDINATOR'

  const [batches,   setBatches]   = useState<Batch[]>([])
  const [batchId,   setBatchId]   = useState('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  // Per-schedule topic edit state (keyed by schedule _id)
  const [topics,      setTopics]      = useState<Record<string, { monday: string; friday: string }>>({})
  const [savingId,    setSavingId]    = useState('')

  // ── Load batches ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return
    getBatches(accessToken).then((list) => {
      const ac = list.filter((b) => b.type !== 'IG')
      setBatches(ac)
      if (ac.length) setBatchId(ac[0]._id)
    }).catch(console.error)
  }, [accessToken])

  // ── Load schedules ──────────────────────────────────────────────────────────

  const load = useCallback(() => {
    if (!accessToken || !batchId) return
    setLoading(true)
    apiFetch<Schedule[]>(`/academics/schedules?batchId=${batchId}`, { token: accessToken })
      .then((data) => {
        // Show all schedules — topics can be set independently
        const sorted = [...data].sort(
          (a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
        )
        setSchedules(sorted)
        // Seed local topic state with existing values from DB
        const seed: Record<string, { monday: string; friday: string }> = {}
        sorted.forEach((s) => {
          seed[s._id] = { monday: s.mondayExamTopic ?? '', friday: s.fridayExamTopic ?? '' }
        })
        setTopics(seed)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken, batchId])

  useEffect(() => { load() }, [load])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function setField(id: string, field: 'monday' | 'friday', val: string) {
    setTopics((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { monday: '', friday: '' }), [field]: val } }))
  }

  async function handleSave(s: Schedule) {
    if (!accessToken) return
    const t = topics[s._id] ?? { monday: '', friday: '' }
    setSavingId(s._id); setError(''); setSuccess('')
    try {
      await apiFetch(`/academics/schedules/${s._id}/exam-topic`, {
        token: accessToken,
        method: 'PATCH',
        body: { mondayExamTopic: t.monday.trim(), fridayExamTopic: t.friday.trim() },
      })
      setSuccess('Exam topics saved.')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSavingId('') }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Exam Topics</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Set Monday &amp; Friday exam topics independently for each week's schedule.
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

      {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}><span className="alert-icon">✅</span>{success}</div>}

      {loading && <div style={{ color: 'var(--color-muted)', padding: '2rem 0' }}>Loading…</div>}

      {!loading && schedules.length === 0 && (
        <div className="card" style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '3rem' }}>
          No schedules found for this batch.
        </div>
      )}

      {!loading && schedules.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {schedules.map((s) => {
            const t = topics[s._id] ?? { monday: s.mondayExamTopic ?? '', friday: s.fridayExamTopic ?? '' }
            const hasTopics = t.monday.trim() || t.friday.trim()
            return (
              <div key={s._id} className="card" style={{
                borderLeft: `4px solid ${s.isPublished ? 'var(--color-success)' : 'var(--color-primary)'}`,
              }}>
                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontWeight: 700 }}>
                      {fmt(s.weekStartDate)} – {fmt(s.weekEndDate)}
                      <span className={`badge ${s.isPublished ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '0.7rem' }}>
                        {s.isPublished ? '✓ Published' : 'Draft'}
                      </span>
                      {hasTopics && (
                        <span className="badge badge-orange" style={{ fontSize: '0.7rem' }}>📝 Topics set</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Topic inputs ── */}
                {canEdit ? (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, flex: '1 1 220px' }}>
                      <label className="label" style={{ fontSize: '0.75rem' }}>Monday Exam Topic</label>
                      <input
                        className="input"
                        style={{ fontSize: '0.8125rem' }}
                        placeholder="e.g. Kinematics + Laws of Motion"
                        value={t.monday}
                        onChange={(e) => setField(s._id, 'monday', e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: '1 1 220px' }}>
                      <label className="label" style={{ fontSize: '0.75rem' }}>Friday Exam Topic</label>
                      <input
                        className="input"
                        style={{ fontSize: '0.8125rem' }}
                        placeholder="e.g. Thermodynamics + Waves"
                        value={t.friday}
                        onChange={(e) => setField(s._id, 'friday', e.target.value)}
                      />
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={savingId === s._id}
                      onClick={() => handleSave(s)}
                      style={{ alignSelf: 'flex-end', flexShrink: 0 }}
                    >
                      {savingId === s._id
                        ? <><span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> Saving…</>
                        : '💾 Save Topics'}
                    </button>
                  </div>
                ) : (
                  /* Read-only view for non-editors */
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {t.monday ? (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Monday Exam</div>
                        <div style={{ fontWeight: 500 }}>{t.monday}</div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No Monday exam topic set.</div>
                    )}
                    {t.friday ? (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Friday Exam</div>
                        <div style={{ fontWeight: 500 }}>{t.friday}</div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No Friday exam topic set.</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
