import { EmptyState } from '@/components/ui/Skeleton'
import { BatchChapter, fmtDate } from './types'

interface PendingVideoReportProps {
  pendingVideoChapters: BatchChapter[]
  onExport: () => void
}

export function PendingVideoReport({ pendingVideoChapters, onExport }: PendingVideoReportProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Pending Video Chapters ({pendingVideoChapters.length})</h2>
        {pendingVideoChapters.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={onExport}>⬇ Export CSV</button>
        )}
      </div>
      {pendingVideoChapters.length === 0 ? (
        <EmptyState
          icon="✅"
          title="All videos are complete!"
          description="No pending video chapters for this batch. Great work!"
        />
      ) : (
        <>
          <div style={{ marginBottom: '0.75rem', padding: '0.625rem 0.875rem', background: 'rgba(245,158,11,.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,.25)', fontSize: '0.8125rem', color: '#92400e' }}>
            ⚠ {pendingVideoChapters.length} chapters need their video marked complete before they can be logged for Residential/Online sessions.
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th style={{ textAlign: 'center' }}>Class Done?</th>
                  <th>Class Date</th>
                </tr>
              </thead>
              <tbody>
                {pendingVideoChapters.map((c) => (
                  <tr key={c._id} style={{ background: c.facultyClassDone ? 'rgba(245,158,11,.04)' : undefined }}>
                    <td style={{ fontWeight: 600 }}>{c.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{c.chapterName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${c.facultyClassDone ? 'badge-yellow' : 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                        {c.facultyClassDone ? '⚠ Class done, no video' : 'Not yet'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{fmtDate(c.facultyClassDoneAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
