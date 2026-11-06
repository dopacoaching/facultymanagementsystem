'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getFacultyHoursBySubject, type SubjectHoursRanking } from '@/services/salary.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import rs from '@/components/hr/reports/Reports.module.css'
import { toLocalISO } from '@/utils/date'

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
    <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
      <div className="card-header">
        <h2 className={rs.subjectName}>{ranking.subject.toLowerCase()}</h2>
        <span className="badge badge-gray">
          <span className="mono">{ranking.faculty.length}</span> faculty
        </span>
      </div>

      <ol className={rs.rank}>
        {ranking.faculty.map((f, i) => (
          <li key={f.facultyId} className={rs.rankRow}>
            <span className={rs.rankNo}>#{i + 1}</span>
            <span className={rs.rankName}>
              {f.name}
              <span className={`badge badge-sentence ${TYPE_BADGE[f.type] ?? 'badge-blue'}`}>{f.type}</span>
            </span>
            <span className={`${rs.rankNum} num`}>
              {f.totalHours.toFixed(1)} hrs · {f.sessionCount} {f.sessionCount === 1 ? 'session' : 'sessions'}
            </span>
            <div className={rs.track} aria-hidden="true">
              <div className={rs.fill} style={{ width: `${Math.max(2, (f.totalHours / maxHours) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ol>

      <details className={rs.details}>
        <summary>View as table</summary>
        <div className="table-wrapper table-stack">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Faculty</th>
                <th>Type</th>
                <th className="num" style={{ textAlign: 'right' }}>Hours</th>
                <th className="num" style={{ textAlign: 'right' }}>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {ranking.faculty.map((f, i) => (
                <tr key={f.facultyId}>
                  <td data-label="Rank" className="num">{i + 1}</td>
                  <td data-label="Faculty" className={rs.strong}>{f.name}</td>
                  <td data-label="Type" className={rs.muted}>{f.type}</td>
                  <td data-label="Hours" className="num" style={{ textAlign: 'right' }}>{f.totalHours.toFixed(1)}</td>
                  <td data-label="Sessions" className="num" style={{ textAlign: 'right' }}>{f.sessionCount}</td>
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
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(toLocalISO(now))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!accessToken) return
    setLoading(true); setError('')
    try {
      const data = await getFacultyHoursBySubject(from, to, accessToken)
      setSubjects(data.subjects)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load faculty hours')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalFaculty = new Set(subjects.flatMap((x) => x.faculty.map((f) => f.facultyId))).size
  const totalHours = subjects.reduce((t, x) => t + x.faculty.reduce((u, f) => u + f.totalHours, 0), 0)
  const totalSessions = subjects.reduce((t, x) => t + x.faculty.reduce((u, f) => u + f.sessionCount, 0), 0)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Faculty Hours by Subject</h1>
          <p className="page-subtitle">Who taught the most (and least) per subject — permanent and temporary faculty together.</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}

      {!loading && subjects.length > 0 && (
        <div className={`stats-grid ${rs.kpis}`} aria-live="polite">
          <div className="stat-card">
            <div className="stat-label">Subjects</div>
            <div className="stat-value">{subjects.length}</div>
            <div className="stat-sub">with sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Hours</div>
            <div className="stat-value">{totalHours.toFixed(1)}</div>
            <div className="stat-sub">{totalSessions} sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Faculty</div>
            <div className="stat-value">{totalFaculty}</div>
            <div className="stat-sub">distinct faculty</div>
          </div>
        </div>
      )}

      <div className={rs.filters}>
        <div className={rs.filterRow}>
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
        </div>
      </div>

      {loading ? (
        <div className="card card-flush"><SkeletonTable rows={5} cols={4} /></div>
      ) : subjects.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No sessions logged"
            description="No completed sessions were found for this range yet."
          />
        </div>
      ) : (
        subjects.map((x) => <SubjectRankingCard key={x.subject} ranking={x} />)
      )}
    </div>
  )
}
