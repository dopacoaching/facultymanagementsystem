'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Batch } from '@/services/faculty.service'
import { SkeletonCard, ErrorAlert, EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { Schedule, ExamTopicCard } from '@/components/academics/exams'

export default function ExamTopicsPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const toast = useToast()
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
      toast.success('Exam topics saved', 'Topics for this week have been updated.')
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
            Set Monday &amp; Friday exam topics independently for each week&apos;s schedule.
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

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}><span className="alert-icon">✅</span>{success}</div>}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      )}

      {!loading && schedules.length === 0 && (
        <EmptyState
          icon="📋"
          title="No schedules found for this batch"
          description="Create a weekly schedule first, then you can set exam topics for each week."
        />
      )}

      {!loading && schedules.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {schedules.map((s) => {
            const t = topics[s._id] ?? { monday: s.mondayExamTopic ?? '', friday: s.fridayExamTopic ?? '' }
            return (
              <ExamTopicCard
                key={s._id}
                schedule={s}
                topic={t}
                canEdit={canEdit}
                saving={savingId === s._id}
                onFieldChange={(field, val) => setField(s._id, field, val)}
                onSave={() => handleSave(s)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
