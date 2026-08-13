'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getFacultyHoursBySubject, type SubjectHoursRanking } from '@/services/salary.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { MonthYearSelector } from '@/components/hr/dashboard'

const TYPE_BADGE: Record<string, string> = {
  PERMANENT:   'badge-green',
  TEMPORARY:   'badge-blue',
  REGULAR:     'badge-green',
  VISITING:    'badge-blue',
  CONTRACTUAL: 'badge-blue',
}

function SubjectRankingCard({ ranking }: { ranking: SubjectHoursRanking }) {
  const maxHours = Math.max(...ranking.faculty.map((f) => f.totalHours), 1)

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <h2 style={{ textTransform: 'capitalize' }}>{ranking.subject.toLowerCase()}</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          {ranking.faculty.length} {ranking.faculty.length === 1 ? 'faculty' : 'faculty'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {ranking.faculty.map((f, i) => (
          <div key={f.facultyId}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', width: '1.25rem' }}>#{i + 1}</span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{f.name}</span>
                <span className={`badge ${TYPE_BADGE[f.type] ?? 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>
                  {f.type}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {f.totalHours.toFixed(1)} hrs · {f.sessionCount} {f.sessionCount === 1 ? 'session' : 'sessions'}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(2, (f.totalHours / maxHours) * 100)}%`,
                  background: 'var(--color-primary)',
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <details style={{ marginTop: '1rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-muted)' }}>View as table</summary>
        <div className="table-wrapper" style={{ marginTop: '0.75rem' }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Faculty</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Hours</th>
                <th style={{ textAlign: 'right' }}>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {ranking.faculty.map((f, i) => (
                <tr key={f.facultyId}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{f.type}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{f.totalHours.toFixed(1)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{f.sessionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

export default function FacultyHoursBySubjectPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [subjects, setSubjects] = useState<SubjectHoursRanking[]>([])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!accessToken) return
    setLoading(true); setError('')
    try {
      const data = await getFacultyHoursBySubject(month, year, accessToken)
      setSubjects(data.subjects)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load faculty hours')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Faculty Hours by Subject</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Who taught the most (and least) per subject — permanent and temporary faculty together.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}

      <MonthYearSelector month={month} onMonthChange={setMonth} year={year} onYearChange={setYear} loading={loading} onRefresh={load} />

      {loading ? (
        <div className="card"><SkeletonTable rows={5} cols={4} /></div>
      ) : subjects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📊"
            title="No sessions logged"
            description="No completed sessions were found for this month yet."
          />
        </div>
      ) : (
        subjects.map((s) => <SubjectRankingCard key={s.subject} ranking={s} />)
      )}
    </div>
  )
}
