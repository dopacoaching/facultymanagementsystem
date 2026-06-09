'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { getBatches } from '@/services/faculty.service'
import type { Batch } from '@/services/faculty.service'
import { SkeletonCard, ErrorAlert } from '@/components/ui/Skeleton'

const SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'] as const
type Subject = (typeof SUBJECTS)[number]

type MonthStatus = 'ON_TRACK' | 'SLIGHTLY_BEHIND' | 'BEHIND' | 'NOT_STARTED' | 'COMPLETED'

interface MonthProgress {
  monthName: string
  chaptersPlanned: number
  chaptersCompleted: number
  chaptersOnTime: number
  chaptersLate: number
  status: MonthStatus
}

interface ProgressResponse {
  batchId: string
  batchName: string
  // month keys are serialised as strings by JSON (e.g. "6", "7" …)
  progress: Record<Subject, Record<string, MonthProgress>>
}

const STATUS_CONFIG: Record<MonthStatus, { label: string; icon: string; cls: string }> = {
  ON_TRACK:        { label: 'On Track',       icon: '✅', cls: 'bg-green-100 text-green-800 border-green-300' },
  SLIGHTLY_BEHIND: { label: '1 Behind',       icon: '⚠️', cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  BEHIND:          { label: 'Behind',         icon: '🔴', cls: 'bg-red-100 text-red-800 border-red-300' },
  NOT_STARTED:     { label: 'Not Started',    icon: '⬜', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  COMPLETED:       { label: 'Completed',      icon: '🏆', cls: 'bg-blue-100 text-blue-800 border-blue-300' },
}

const SUBJECT_LABEL: Record<Subject, string> = {
  PHYSICS:   'Physics',
  CHEMISTRY: 'Chemistry',
  BIOLOGY:   'Biology',
}

const MONTHS = [6, 7, 8, 9, 10, 11, 12]
const MONTH_SHORT: Record<number, string> = {
  6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
}

export default function SyllabusProgressPage() {
  const { accessToken, role, batchId: coordinatorBatchId } = useAppSelector((s) => s.auth)

  const [batches,   setBatches]   = useState<Batch[]>([])
  const [batchId,   setBatchId]   = useState('')
  const [data,      setData]      = useState<ProgressResponse | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const isCoordinator = role === 'COORDINATOR'

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
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Syllabus Progress</h1>
          <p className="text-sm text-gray-500 mt-1">Track each batch against the annual plan</p>
        </div>
        {batches.length > 1 && (
          <select
            className="sm:ml-auto border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          >
            {batches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      )}
      {error && (
        <ErrorAlert message={error} what="Failed to load syllabus progress" />
      )}

      {!loading && data && (
        <div className="space-y-8">
          {SUBJECTS.map((subj) => {
            const subjectProgress = data.progress[subj]
            if (!subjectProgress) return null

            const monthEntries = MONTHS
              .map((m) => ({ month: m, data: subjectProgress[String(m)] }))
              .filter((e) => !!e.data)

            if (monthEntries.length === 0) return null

            const totalPlanned   = monthEntries.reduce((s, e) => s + e.data.chaptersPlanned,   0)
            const totalCompleted = monthEntries.reduce((s, e) => s + e.data.chaptersCompleted, 0)
            const pct = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0

            return (
              <section key={subj} className="rounded-xl border border-gray-200 overflow-hidden">
                {/* Subject header */}
                <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-3">
                  <h2 className="font-bold text-gray-700">{SUBJECT_LABEL[subj]}</h2>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{totalCompleted}/{totalPlanned} chapters</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gray-700">{pct}%</span>
                  </div>
                </div>

                {/* Month rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2 w-24">Month</th>
                        <th className="text-center px-3 py-2">Planned</th>
                        <th className="text-center px-3 py-2">Done</th>
                        <th className="text-center px-3 py-2">On Time</th>
                        <th className="text-center px-3 py-2">Late</th>
                        <th className="text-left px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthEntries.map(({ month, data: md }) => {
                        const cfg = STATUS_CONFIG[md.status]
                        return (
                          <tr key={month} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-gray-700">
                              {MONTH_SHORT[month]}
                            </td>
                            <td className="text-center px-3 py-2.5 text-gray-600">{md.chaptersPlanned}</td>
                            <td className="text-center px-3 py-2.5 text-gray-600">{md.chaptersCompleted}</td>
                            <td className="text-center px-3 py-2.5 text-green-600">{md.chaptersOnTime}</td>
                            <td className="text-center px-3 py-2.5 text-orange-500">{md.chaptersLate}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2.5 py-0.5 ${cfg.cls}`}>
                                {cfg.icon} {cfg.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {!loading && !data && !error && (
        <div className="text-center text-gray-400 py-12">Select a batch to view progress.</div>
      )}
    </div>
  )
}
