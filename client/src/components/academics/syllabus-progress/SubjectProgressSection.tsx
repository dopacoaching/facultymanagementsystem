import { MONTHS, MONTH_SHORT, STATUS_CONFIG, SUBJECT_LABEL } from './types'
import type { ProgressResponse, Subject } from './types'
import s from './Progress.module.css'

interface SubjectProgressSectionProps {
  subject: Subject
  progress: ProgressResponse['progress'][Subject]
}

export function SubjectProgressSection({ subject, progress }: SubjectProgressSectionProps) {
  const monthEntries = MONTHS
    .map((m) => ({ month: m, data: progress[String(m)] }))
    .filter((e) => !!e.data)

  if (monthEntries.length === 0) return null

  const totalPlanned   = monthEntries.reduce((sum, e) => sum + e.data.chaptersPlanned,   0)
  const totalCompleted = monthEntries.reduce((sum, e) => sum + e.data.chaptersCompleted, 0)
  const pct = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0

  return (
    <section className="card card-flush" aria-label={`${SUBJECT_LABEL[subject]} progress`}>
      <div className={`card-header ${s.head}`}>
        <h2>{SUBJECT_LABEL[subject]}</h2>
        <div className={s.summary}>
          <span className={`${s.done} num`}>{totalCompleted}/{totalPlanned} chapters</span>
          <div
            className={`progress ${s.bar}`}
            role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
            aria-label={`${SUBJECT_LABEL[subject]} completion`}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className={s.pct}>{pct}%</span>
        </div>
      </div>

      <div className={`table-wrapper table-stack ${s.flush}`}>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">Planned</th>
              <th className="num">Done</th>
              <th className="num">On Time</th>
              <th className="num">Late</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {monthEntries.map(({ month, data: md }) => {
              const cfg = STATUS_CONFIG[md.status]
              return (
                <tr key={month}>
                  <td data-label="Month" className={s.month}>{MONTH_SHORT[month]}</td>
                  <td data-label="Planned" className="num">{md.chaptersPlanned}</td>
                  <td data-label="Done" className="num">{md.chaptersCompleted}</td>
                  <td data-label="On Time" className={`num ${s.onTime}`}>{md.chaptersOnTime}</td>
                  <td data-label="Late" className={`num ${s.late}`}>{md.chaptersLate}</td>
                  <td data-label="Status">
                    <span className={`badge badge-dot ${cfg.cls}`}>{cfg.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
