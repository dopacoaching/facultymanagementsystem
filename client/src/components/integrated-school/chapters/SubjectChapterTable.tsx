import { ALL_STATUSES, STATUS_BADGE, STATUS_LABEL, fmt } from './types'
import type { ChapterStatus, ISChapter } from './types'

interface SubjectChapterTableProps {
  subject: string
  chapters: ISChapter[]
  canEdit: boolean
  updating: string
  onStatusChange: (id: string, status: ChapterStatus) => void
}

export function SubjectChapterTable({ subject, chapters, canEdit, updating, onStatusChange }: SubjectChapterTableProps) {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: 0, color: 'var(--color-primary)' }}>{subject}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          <span>{chapters.filter((c) => c.status === 'COMPLETED').length}/{chapters.length} completed</span>
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Chapter</th>
              <th style={{ width: 140 }}>Status</th>
              <th style={{ width: 110, fontSize: '0.75rem' }}>Scheduled</th>
              <th style={{ width: 110, fontSize: '0.75rem' }}>Completed</th>
              {canEdit && <th style={{ width: 180 }}>Change Status</th>}
            </tr>
          </thead>
          <tbody>
            {chapters.map((ch) => (
              <tr key={ch._id} style={{
                opacity: ch.status === 'CANCELLED' ? 0.55 : 1,
                background: ch.status === 'COMPLETED' ? 'rgba(16,185,129,0.04)' : 'transparent',
              }}>
                <td style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', textAlign: 'center' }}>
                  {ch.chapterOrder}
                </td>
                <td style={{ fontWeight: ch.status === 'COMPLETED' ? 500 : 400 }}>
                  {ch.status === 'COMPLETED' && (
                    <span style={{ marginRight: '0.375rem', color: 'var(--color-success)' }}>✓</span>
                  )}
                  {ch.chapterName}
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[ch.status]}`}>{STATUS_LABEL[ch.status]}</span>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                  {fmt(ch.scheduledDate)}
                </td>
                <td style={{ fontSize: '0.8rem', color: ch.completedDate ? 'var(--color-success)' : 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                  {fmt(ch.completedDate)}
                </td>
                {canEdit && (
                  <td>
                    <select
                      className="input"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      value={ch.status}
                      disabled={updating === ch._id}
                      onChange={(e) => onStatusChange(ch._id, e.target.value as ChapterStatus)}
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                    {updating === ch._id && (
                      <span className="spinner" style={{ display: 'inline-block', marginLeft: '0.5rem', width: '0.875rem', height: '0.875rem' }} />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
