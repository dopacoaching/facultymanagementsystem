'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Batch } from '@/services/faculty.service'
import { SkeletonTable, ErrorAlert, EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  ISChapter, ChapterStatus, ISChaptersFilterBar, ISChaptersStatsBar, SubjectChapterTable,
} from '@/components/integrated-school/chapters'

const todayISO = () => todayLocal()

export default function ISChaptersPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const toast = useToast()

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
    setChapters([]) // clear stale chapters from previous batch immediately
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
      const chapter = chapters.find((c) => c._id === id)
      const body: Record<string, unknown> = { status }
      // Auto-stamp today when entering SCHEDULED or COMPLETED for the first time
      if (status === 'SCHEDULED' && !chapter?.scheduledDate) body.scheduledDate = todayISO()
      if (status === 'COMPLETED' && !chapter?.completedDate) body.completedDate = todayISO()
      // Clear dates when reverting to unscheduled/cancelled
      if (status === 'NOT_YET_SCHEDULED' || status === 'CANCELLED') {
        body.scheduledDate = null
        body.completedDate = null
      }
      const updated = await apiFetch<ISChapter>(`/ig/chapters/${id}`, {
        method: 'PATCH', token: accessToken, body,
      })
      setChapters((prev) => prev.map((c) => c._id === id ? updated : c))
      toast.success('Chapter updated', `Status changed to ${status.replace(/_/g, ' ').toLowerCase()}.`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally { setUpdating('') }
  }

  const selectedBatchObj = batches.find((b) => b._id === selectedBatch)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>IG Chapter Progress</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {selectedBatchObj ? selectedBatchObj.name : 'Select a batch'}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} onRetry={() => setError('')} />
        </div>
      )}

      <ISChaptersFilterBar
        batches={batches}
        selectedBatch={selectedBatch}
        onBatchChange={setSelectedBatch}
        subjects={subjects}
        filterSubject={filterSubject}
        onFilterSubjectChange={setFilterSubject}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        onClearFilters={() => { setFilterSubject(''); setFilterStatus('ALL') }}
      />

      <ISChaptersStatsBar {...stats} />

      {loading ? (
        <div className="card">
          <SkeletonTable rows={6} cols={5} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📚"
            title="No chapters found"
            description="Try selecting a different batch or adjusting the filters. Chapters are seeded from the yearly plan."
          />
        </div>
      ) : (
        Object.entries(bySubject).map(([subject, subChapters]) => (
          <SubjectChapterTable
            key={subject}
            subject={subject}
            chapters={subChapters}
            canEdit={canEdit}
            updating={updating}
            onStatusChange={handleStatusChange}
          />
        ))
      )}
    </div>
  )
}
