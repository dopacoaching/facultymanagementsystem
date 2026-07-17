import type { Session } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'
import { MONTHS } from './types'

interface FacultyActivityItem {
  name: string
  sessions: number
  hours: number
  completed: number
  cancelled: number
}

interface FacultyActivityReportProps {
  sessions: Session[]
  facultyActivity: FacultyActivityItem[]
  actMonth: number
  actYear: number
  onExport: () => void
}

export function FacultyActivityReport({ sessions, facultyActivity, actMonth, actYear, onExport }: FacultyActivityReportProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Faculty Activity — {MONTHS[actMonth - 1]} {actYear}</h2>
        {facultyActivity.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={onExport}>⬇ Export CSV</button>
        )}
      </div>
      {facultyActivity.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No sessions found"
          description="No sessions were logged for the selected period and batch."
        />
      ) : (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Faculty Active', value: facultyActivity.length, color: 'var(--color-primary)' },
              { label: 'Total Sessions', value: sessions.length, color: 'var(--color-text)' },
              { label: 'Total Hours', value: sessions.reduce((s, x) => s + x.durationHours, 0).toFixed(1), color: 'var(--color-success)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '0.75rem 1.25rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center', flex: '1 1 120px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th style={{ textAlign: 'right' }}>Sessions</th>
                  <th style={{ textAlign: 'right' }}>Hours</th>
                  <th style={{ textAlign: 'right' }}>Completed</th>
                  <th style={{ textAlign: 'right' }}>Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {facultyActivity.map((f) => (
                  <tr key={f.name}>
                    <td style={{ fontWeight: 600 }}>{f.name}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{f.sessions}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{f.hours.toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{f.completed}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {f.cancelled > 0
                        ? <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>{f.cancelled}</span>
                        : <span style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--color-border)' }}>
                  <td>Total</td>
                  <td style={{ textAlign: 'right' }}>{sessions.length}</td>
                  <td style={{ textAlign: 'right' }}>{sessions.reduce((s, x) => s + x.durationHours, 0).toFixed(1)}</td>
                  <td style={{ textAlign: 'right' }}>{sessions.filter((s) => s.status === 'COMPLETED').length}</td>
                  <td style={{ textAlign: 'right' }}>{sessions.filter((s) => s.status === 'CANCELLED').length}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
