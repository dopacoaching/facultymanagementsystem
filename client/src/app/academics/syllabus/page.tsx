'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { SkeletonCard, ErrorAlert } from '@/components/ui/Skeleton'
import {
  SUBJECTS, AnnualSyllabus, Subject, SUBJECT_LABEL, MonthSection, SplitChaptersLegend,
} from '@/components/academics/syllabus'
import s from '@/components/academics/syllabus/Syllabus.module.css'

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
    <div className="stack" aria-busy="true">
      <SkeletonCard lines={3} />
      <SkeletonCard lines={5} />
      <SkeletonCard lines={5} />
    </div>
  )
  if (error) return (
    <ErrorAlert message={error} what="Failed to load annual syllabus" />
  )

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Annual Syllabus Schedule</h1>
          <p className="page-subtitle">June–December 2025–26 · NEET DOPA Coaching</p>
        </div>
      </div>

      <div className="stats-grid">
        {SUBJECTS.map((subj) => (
          <div key={subj} className="stat-card">
            <div className="stat-label">{SUBJECT_LABEL[subj]}</div>
            <div className="stat-value num">{totals[subj]}</div>
            <div className="stat-sub">chapters</div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value num">{Object.values(totals).reduce((sum, n) => sum + n, 0)}</div>
          <div className="stat-sub">chapters</div>
        </div>
      </div>

      <div className={s.months}>
        {months.map((month) => (
          <MonthSection key={month} monthData={syllabus[String(month)]} />
        ))}
      </div>

      <SplitChaptersLegend />
    </div>
  )
}
