'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Batch } from '@/services/faculty.service'
import { SkeletonTable, ErrorAlert, EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

interface ChapterRow {
  _id: string
  syllabusChapterId: string | null
  batchId: string
  subject: string
  chapterName: string
  chapterOrder: number
  scheduledMonth: number | null
  totalVideos: number | null
  videoReshooting: boolean
  videosWatched: number
  videoComplete: boolean
  videoCompletedAt: string | null
  facultyClassDone: boolean
  facultyClassDoneAt: string | null
  isStub: boolean
}

const MONTH = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt   = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function VideoCell({
  row, canEdit, saving, onSave,
}: {
  row: ChapterRow
  canEdit: boolean
  saving: boolean
  onSave: (watched: number) => void
}) {
  const total = row.totalVideos ?? 0
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(String(row.videosWatched))
  const inputRef              = useRef<HTMLInputElement>(null)

  // No videos for this chapter — show static badge
  if (total === 0) {
    return (
      <td style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>no videos</span>
      </td>
    )
  }

  const pct      = Math.round((row.videosWatched / total) * 100)
  const complete = row.videoComplete

  if (!editing) {
    return (
      <td style={{ textAlign: 'center', minWidth: 120 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          {/* Progress bar */}
          <div style={{ width: 80, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: complete ? 'var(--color-success)' : 'var(--color-primary)',
              borderRadius: 3, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: complete ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
              {row.videosWatched}/{total}
            </span>
            {row.videoReshooting && (
              <span title="Videos being reshot" style={{ fontSize: '0.65rem', background: 'var(--color-warning)', color: '#fff', borderRadius: 3, padding: '0 4px' }}>
                reshooting
              </span>
            )}
            {canEdit && !saving && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.7rem', padding: '1px 6px', lineHeight: 1.4 }}
                onClick={() => { setVal(String(row.videosWatched)); setEditing(true); setTimeout(() => inputRef.current?.select(), 0) }}
              >
                edit
              </button>
            )}
          </div>
        </div>
      </td>
    )
  }

  return (
    <td style={{ textAlign: 'center', minWidth: 120 }}>
      <form
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        onSubmit={(e) => { e.preventDefault(); const n = Math.max(0, Math.min(total, Number(val))); onSave(n); setEditing(false) }}
      >
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={total}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
          style={{ width: 48, padding: '2px 4px', fontSize: '0.8rem', textAlign: 'center', border: '1px solid var(--color-border)', borderRadius: 4 }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>/{total}</span>
        <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>✓</button>
        <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 6px' }} onClick={() => setEditing(false)}>✕</button>
      </form>
    </td>
  )
}

export default function ChaptersPage() {
  const { accessToken, role, batchId: coordinatorBatchId } = useAppSelector((s) => s.auth)
  const toast = useToast()

  const [chapters, setChapters]       = useState<ChapterRow[]>([])
  const [batches, setBatches]         = useState<Batch[]>([])
  const [batchId, setBatchId]         = useState('')
  const [subjectFilter, setSubject]   = useState('')
  const [loading, setLoading]         = useState(false)
  const [loadError, setLoadError]     = useState('')
  const [saving, setSaving]           = useState<Record<string, boolean>>({})
  const [saveError, setSaveError]     = useState('')

  const canMarkVideo = role === 'COORDINATOR' || role === 'ACADEMICS_MANAGER' || role === 'ADMIN'
  const canMarkClass = role === 'ACADEMICS_MANAGER' || role === 'ADMIN' || role === 'HR_MANAGER'
  const isCoordinator = role === 'COORDINATOR'

  useEffect(() => {
    if (!accessToken) return
    getBatches(accessToken).then((list) => {
      const ac = list.filter((b) => b.type !== 'IG')
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
    setLoadError('')
    apiFetch<ChapterRow[]>(`/academics/chapters?batchId=${batchId}`, { token: accessToken })
      .then(setChapters)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Failed to load chapters'))
      .finally(() => setLoading(false))
  }, [accessToken, batchId])

  const subjects = useMemo(() => [...new Set(chapters.map((c) => c.subject))].sort(), [chapters])

  const filtered = useMemo(() => {
    if (!subjectFilter) return chapters
    return chapters.filter((c) => c.subject === subjectFilter)
  }, [chapters, subjectFilter])

  // Update videosWatched — uses video-progress endpoint for stubs (no BatchChapter yet),
  // PATCH by ID for existing records.
  async function saveVideoProgress(row: ChapterRow, watched: number) {
    if (!accessToken) return
    setSaving((s) => ({ ...s, [row._id]: true }))
    setSaveError('')
    try {
      let updated: ChapterRow
      if (row.isStub && row.syllabusChapterId) {
        updated = await apiFetch<ChapterRow>('/academics/chapters/video-progress', {
          method: 'POST', token: accessToken,
          body: { batchId, syllabusChapterId: row.syllabusChapterId, videosWatched: watched },
        })
        // Stub becomes a real record; update _id and isStub
        updated = { ...row, ...updated, isStub: false }
      } else {
        updated = await apiFetch<ChapterRow>(`/academics/chapters/${row._id}`, {
          method: 'PATCH', token: accessToken,
          body: { videosWatched: watched },
        })
      }
      setChapters((prev) => prev.map((c) => {
        const matchId = c._id === row._id
        const matchSyll = c.syllabusChapterId && c.syllabusChapterId === row.syllabusChapterId
        return (matchId || matchSyll) ? { ...c, ...updated } : c
      }))
      const total = row.totalVideos ?? 0
      if (total > 0 && watched >= total) toast.success('Videos complete', `All ${total} videos marked for "${row.chapterName}".`)
      else toast.success('Updated', `${watched}/${total} videos recorded for "${row.chapterName}".`)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving((s) => ({ ...s, [row._id]: false }))
    }
  }

  async function toggleFacultyClass(row: ChapterRow) {
    if (!accessToken || row.isStub) return
    setSaving((s) => ({ ...s, [row._id]: true }))
    try {
      const updated = await apiFetch<ChapterRow>(`/academics/chapters/${row._id}`, {
        method: 'PATCH', token: accessToken,
        body: { facultyClassDone: !row.facultyClassDone },
      })
      setChapters((prev) => prev.map((c) => c._id === row._id ? { ...c, ...updated } : c))
      toast.success('Updated', 'Class status updated.')
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving((s) => ({ ...s, [row._id]: false }))
    }
  }

  const totalCount   = filtered.length
  const videoCount   = filtered.filter((c) => c.videoComplete).length
  const classCount   = filtered.filter((c) => c.facultyClassDone).length
  const pendingVideo = filtered.filter((c) => !c.videoComplete && (c.totalVideos ?? 0) > 0).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Chapter Progress</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Track video watch progress and faculty class status per chapter
          </p>
        </div>
      </div>

      {(loadError || saveError) && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={loadError || saveError} onRetry={() => { setLoadError(''); setSaveError('') }} />
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
            { label: 'Total Chapters', value: totalCount,   color: 'var(--color-text-secondary)' },
            { label: 'Videos Complete', value: videoCount,  color: 'var(--color-success)' },
            { label: 'Class Done',      value: classCount,  color: 'var(--color-primary)' },
            { label: 'Videos Pending',  value: pendingVideo, color: 'var(--color-warning)' },
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
            title={totalCount === 0 ? 'No chapters found' : 'No chapters match the filter'}
            description={totalCount === 0
              ? 'Select a batch to view the syllabus chapter list.'
              : 'Try selecting a different subject.'}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Month</th>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th style={{ textAlign: 'center' }}>🎬 Videos watched</th>
                  <th style={{ textAlign: 'center', fontSize: '0.75rem' }}>Video date</th>
                  <th style={{ textAlign: 'center' }}>📖 Class done</th>
                  <th style={{ textAlign: 'center', fontSize: '0.75rem' }}>Class date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ch) => (
                  <tr key={ch._id} style={{ opacity: ch.isStub ? 0.7 : 1 }}>
                    <td style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>{ch.chapterOrder || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                      {ch.scheduledMonth ? MONTH[ch.scheduledMonth] : '—'}
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{ch.subject}</td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{ch.chapterName}</td>

                    {/* Videos watched */}
                    <VideoCell
                      row={ch}
                      canEdit={canMarkVideo}
                      saving={!!saving[ch._id]}
                      onSave={(n) => saveVideoProgress(ch, n)}
                    />

                    <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {fmt(ch.videoCompletedAt)}
                    </td>

                    {/* Faculty class done */}
                    <td style={{ textAlign: 'center' }}>
                      {canMarkClass && !ch.isStub ? (
                        <button
                          className={`btn btn-sm ${ch.facultyClassDone ? 'btn-success' : 'btn-outline'}`}
                          style={{ minWidth: 64, fontSize: '0.75rem' }}
                          disabled={!!saving[ch._id]}
                          onClick={() => toggleFacultyClass(ch)}
                          title={ch.facultyClassDone ? 'Mark class as not done' : 'Mark class as done'}
                        >
                          {ch.facultyClassDone ? '✓ Done' : 'Pending'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8125rem' }}>
                          {ch.facultyClassDone ? '✓' : ch.isStub ? '—' : '–'}
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {fmt(ch.facultyClassDoneAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
