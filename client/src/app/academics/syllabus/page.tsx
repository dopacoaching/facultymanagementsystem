'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { SkeletonCard, ErrorAlert } from '@/components/ui/Skeleton'
import {
  SUBJECTS, AnnualSyllabus, Subject, SUBJECT_LABEL, SUBJECT_COLOR, MonthSection, SplitChaptersLegend,
} from '@/components/academics/syllabus'

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
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Annual Syllabus Schedule</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          June–December 2025–26 · NEET DOPA Coaching
        </p>
      </div>

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

      <div className="space-y-8">
        {months.map((month) => (
          <MonthSection key={month} monthData={syllabus[String(month)]} />
        ))}
      </div>

      <SplitChaptersLegend />
    </div>
  )
}
