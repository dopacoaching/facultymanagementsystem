'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { SkeletonCard, ErrorAlert } from '@/components/ui/Skeleton'

const SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'] as const
type Subject = (typeof SUBJECTS)[number]

interface SyllabusChapter {
  _id: string
  chapterName: string
  chapterOrder: number
  globalOrder: number
  isSplitPart: boolean
  splitGroup?: string
  splitPartNumber?: number
}

interface MonthData {
  monthName: string
  subjects: Partial<Record<Subject, SyllabusChapter[]>>
}

type AnnualSyllabus = Record<string, MonthData>

const SUBJECT_LABEL: Record<Subject, string> = {
  PHYSICS:   'Physics',
  CHEMISTRY: 'Chemistry',
  BIOLOGY:   'Biology',
}

const SUBJECT_COLOR: Record<Subject, string> = {
  PHYSICS:   'border-blue-400  bg-blue-50  text-blue-800',
  CHEMISTRY: 'border-green-400 bg-green-50 text-green-800',
  BIOLOGY:   'border-emerald-400 bg-emerald-50 text-emerald-800',
}

export default function AnnualSyllabusPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [syllabus, setSyllabus] = useState<AnnualSyllabus>({})
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!accessToken) { setLoading(false); return }
    setLoading(true)
    apiFetch<AnnualSyllabus>('/academics/syllabus', { token: accessToken })
      .then(setSyllabus)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [accessToken])

  const months = Object.keys(syllabus).map(Number).sort((a, b) => a - b)  // keys are strings in JSON; map to numbers for sorting

  // Total chapters per subject across the year
  const totals: Record<Subject, number> = { PHYSICS: 0, CHEMISTRY: 0, BIOLOGY: 0 }
  for (const m of months) {
    const md = syllabus[String(m)]
    for (const subj of SUBJECTS) {
      totals[subj] += (md.subjects[subj]?.length ?? 0)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SkeletonCard lines={3} />
      <SkeletonCard lines={5} />
      <SkeletonCard lines={5} />
    </div>
  )
  if (error) return (
    <ErrorAlert message={error} what="Failed to load annual syllabus" />
  )

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Annual Syllabus Schedule</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          June–December 2025–26 · NEET DOPA Coaching
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {SUBJECTS.map((subj) => (
          <div
            key={subj}
            className={`border rounded-lg px-4 py-2 text-sm font-semibold ${SUBJECT_COLOR[subj]}`}
          >
            {SUBJECT_LABEL[subj]}: {totals[subj]} chapters
          </div>
        ))}
        <div className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700">
          Total: {Object.values(totals).reduce((s, n) => s + n, 0)} chapters
        </div>
      </div>

      {/* Month-by-month table */}
      <div className="space-y-8">
        {months.map((month) => {
          const md = syllabus[String(month)]
          return (
            <section key={month}>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                {md.monthName}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {SUBJECTS.map((subj) => {
                  const chapters = md.subjects[subj]
                  if (!chapters || chapters.length === 0) return null
                  return (
                    <div
                      key={subj}
                      className={`rounded-xl border-2 p-3 ${SUBJECT_COLOR[subj]}`}
                    >
                      <div className="text-xs font-bold uppercase tracking-wide mb-2">
                        {SUBJECT_LABEL[subj]}
                        <span className="ml-2 font-normal opacity-70">({chapters.length})</span>
                      </div>
                      <ol className="space-y-1">
                        {chapters.map((ch) => (
                          <li key={ch._id} className="flex items-start gap-1 text-sm">
                            <span className="opacity-50 shrink-0 w-4 text-right">{ch.chapterOrder}.</span>
                            <span className={ch.isSplitPart ? 'italic' : ''}>
                              {ch.chapterName}
                              {ch.isSplitPart && (
                                <span className="ml-1 text-xs opacity-60">(split)</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* Split chapters legend */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Split Chapters</h3>
        <p className="text-xs text-gray-500 mb-3">
          These chapters span two months. Part 2 can only be scheduled after Part 1 is completed.
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <span><strong>GOC</strong> — Chemistry: Part 1 (August) → Part 2 (September)</span>
          <span><strong>Biotechnology</strong> — Biology: Part 1 (September) → Part 2 (October)</span>
          <span><strong>Genetics</strong> — Biology: Part 1 (September) → Part 2 (October)</span>
        </div>
      </div>
    </div>
  )
}
