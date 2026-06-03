'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Batch } from '@/services/faculty.service'

// ─── Types ────────────────────────────────────────────────────────────────────

type ChapterStatus = 'NOT_YET_SCHEDULED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

interface ISChapter {
  _id:           string
  batchId:       string
  subject:       string
  chapterName:   string
  chapterOrder:  number
  status:        ChapterStatus
  scheduledDate?: string
  completedDate?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ChapterStatus, string> = {
  NOT_YET_SCHEDULED: 'badge-gray',
  SCHEDULED:         'badge-blue',
  COMPLETED:         'badge-green',
  CANCELLED:         'badge-red',
}

const STATUS_LABEL: Record<ChapterStatus, string> = {
  NOT_YET_SCHEDULED: 'Not Scheduled',
  SCHEDULED:         'Scheduled',
  COMPLETED:         'Completed',
  CANCELLED:         'Cancelled',
}

const ALL_STATUSES: ChapterStatus[] = ['NOT_YET_SCHEDULED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']

// ─── Component ────────────────────────────────────────────────────────────────

export default function ISChaptersPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)

  const [batches,     setBatches]     = useState<Batch[]>([])
  const [chapters,    setChapters]    = useState<ISChapter[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterStatus,  setFilterStatus]  = useState<ChapterStatus | 'ALL'>('ALL')
  const [loading,     setLoading]     = useState(false)
  const [updating,    setUpdating]    = useState('')
  const [error,       setError]       = useState('')

  const canEdit = ['ADMIN', 'IG_ACADEMICS_MANAGER', 'ACADEMICS_MANAGER', 'HR_MANAGER'].includes(role ?? '')

  // ── Load IG Batches ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return
    getBatches(accessToken).then((list) => {
      const isb = list.filter((b) => b.type === 'IG')
      setBatches(isb)
      if (isb.length) setSelectedBatch(isb[0]._id)
    }).catch(console.error)
  }, [accessToken])

  // ── Load chapters ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken || !selectedBatch) return
    setLoading(true)
    apiFetch<ISChapter[]>(`/ig/chapters?batchId=${selectedBatch}`, { token: accessToken })
      .then(setChapters)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken, selectedBatch])

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = chapters.length
    const scheduled = chapters.filter((c) => c.status === 'SCHEDULED').length
    const completed = chapters.filter((c) => c.status === 'COMPLETED').length
    const pending   = chapters.filter((c) => c.status === 'NOT_YET_SCHEDULED').length
    const cancelled = chapters.filter((c) => c.status === 'CANCELLED').length
    return { total, scheduled, completed, pending, cancelled }
  }, [chapters])

  // ── Subjects for filter ─────────────────────────────────────────────────────
  const subjects = useMemo(() => {
    const set = new Set(chapters.map((c) => c.subject))
    return Array.from(set).sort()
  }, [chapters])

  // ── Filtered chapters ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = chapters
    if (filterSubject) list = list.filter((c) => c.subject === filterSubject)
    if (filterStatus !== 'ALL') list = list.filter((c) => c.status === filterStatus)
    return list.sort((a, b) => a.subject.localeCompare(b.subject) || a.chapterOrder - b.chapterOrder)
  }, [chapters, filterSubject, filterStatus])

  // ── Group by subject ────────────────────────────────────────────────────────
  const bySubject = useMemo(() => {
    const map: Record<string, ISChapter[]> = {}
    for (const ch of filtered) {
      if (!map[ch.subject]) map[ch.subject] = []
      map[ch.subject].push(ch)
    }
    return map
  }, [filtered])

  // ── Update status ───────────────────────────────────────────────────────────
  async function handleStatusChange(id: string, status: ChapterStatus) {
    if (!accessToken) return
    setUpdating(id); setError('')
    try {
      const updated = await apiFetch<ISChapter>(`/ig/chapters/${id}`, {
        method: 'PATCH', token: accessToken, body: { status },
      })
      setChapters((prev) => prev.map((c) => c._id === id ? updated : c))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally { setUpdating('') }
  }

  const selectedBatchObj = batches.find((b) => b._id === selectedBatch)

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>IG Chapter Progress</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {selectedBatchObj ? selectedBatchObj.name : 'Select a batch'}
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <span className="alert-icon">⚠</span>{error}
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem', padding: '0.875rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: 200 }}>
            <label className="label" style={{ marginBottom: '0.25rem' }}>IG Batch</label>
            <select className="input" value={selectedBatch}
              onChange={(e) => { setSelectedBatch(e.target.value); setFilterSubject('') }}>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
            <label className="label" style={{ marginBottom: '0.25rem' }}>Subject</label>
            <select className="input" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
            <label className="label" style={{ marginBottom: '0.25rem' }}>Status</label>
            <select className="input" value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ChapterStatus | 'ALL')}>
              <option value="ALL">All Statuses</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          {(filterSubject || filterStatus !== 'ALL') && (
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: '0.125rem' }}
              onClick={() => { setFilterSubject(''); setFilterStatus('ALL') }}>Clear Filters</button>
          )}
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        {[
          { label: 'Total',        value: stats.total,     color: 'var(--color-primary)' },
          { label: 'Not Scheduled', value: stats.pending,  color: 'var(--color-muted)' },
          { label: 'Scheduled',    value: stats.scheduled, color: 'var(--color-info, #3b82f6)' },
          { label: 'Completed',    value: stats.completed, color: 'var(--color-success)' },
          { label: 'Cancelled',    value: stats.cancelled, color: 'var(--color-danger)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card" style={{ padding: '0.875rem 1rem' }}>
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color, fontSize: '1.5rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Chapter tables by subject ─────────────────────────────────────── */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
          <span className="spinner" style={{ display: 'inline-block', marginRight: '0.5rem' }} />Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>No chapters found</h3>
            <p>Try adjusting the filters</p>
          </div>
        </div>
      ) : (
        Object.entries(bySubject).map(([subject, subChapters]) => (
          <div key={subject} className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: 0, color: 'var(--color-primary)' }}>{subject}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                <span>{subChapters.filter((c) => c.status === 'COMPLETED').length}/{subChapters.length} completed</span>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Chapter</th>
                    <th style={{ width: 140 }}>Status</th>
                    {canEdit && <th style={{ width: 180 }}>Change Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {subChapters.map((ch) => (
                    <tr key={ch._id} style={{
                      opacity: ch.status === 'CANCELLED' ? 0.55 : 1,
                      background: ch.status === 'COMPLETED' ? 'rgba(16,185,129,0.04)' : 'transparent',
                    }}>
                      <td style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', textAlign: 'center' }}>
                        {ch.chapterOrder}
                      </td>
                      <td style={{ fontWeight: ch.status === 'COMPLETED' ? 500 : 400 }}>
                        {ch.status === 'COMPLETED' && (
                          <span style={{ marginRight: '0.375rem', color: 'var(--color-success)' }}>✓</span>
                        )}
                        {ch.chapterName}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[ch.status]}`}>{STATUS_LABEL[ch.status]}</span>
                      </td>
                      {canEdit && (
                        <td>
                          <select
                            className="input"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            value={ch.status}
                            disabled={updating === ch._id}
                            onChange={(e) => handleStatusChange(ch._id, e.target.value as ChapterStatus)}
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                          {updating === ch._id && (
                            <span className="spinner" style={{ display: 'inline-block', marginLeft: '0.5rem', width: '0.875rem', height: '0.875rem' }} />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
