'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Batch } from '@/services/faculty.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  ChapterRow, ChaptersFilterBar, ChaptersStatsBar, ChaptersTable,
} from '@/components/academics/chapters'

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

      <ChaptersFilterBar
        batches={batches}
        batchId={batchId}
        onBatchChange={setBatchId}
        isCoordinator={isCoordinator}
        subjectFilter={subjectFilter}
        onSubjectChange={setSubject}
        subjects={subjects}
      />

      <ChaptersStatsBar
        totalCount={totalCount}
        videoCount={videoCount}
        classCount={classCount}
        pendingVideo={pendingVideo}
      />

      <ChaptersTable
        loading={loading}
        filtered={filtered}
        totalCount={totalCount}
        canMarkVideo={canMarkVideo}
        canMarkClass={canMarkClass}
        saving={saving}
        onSaveVideoProgress={saveVideoProgress}
        onToggleFacultyClass={toggleFacultyClass}
      />
    </div>
  )
}
