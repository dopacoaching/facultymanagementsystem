import { EmptyState } from '@/components/ui/Skeleton'
import { BatchChapter, fmtDate } from './types'

interface ChapterCompletionReportProps {
  chapters: BatchChapter[]
  chapterStats: [string, { total: number; videoComplete: number; classComplete: number; pending: number }][]
  onExport: () => void
}

export function ChapterCompletionReport({ chapters, chapterStats, onExport }: ChapterCompletionReportProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card">
        <div className="card-header">
          <h2>Chapter Completion by Subject</h2>
          {chapters.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={onExport}>⬇ Export CSV</button>
          )}
        </div>
        {chapterStats.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No chapters yet"
            description="No chapters found for this batch. Log a session to automatically create chapter records."
          />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
              {chapterStats.map(([subject, stats]) => {
                const videoPct = stats.total > 0 ? Math.round((stats.videoComplete / stats.total) * 100) : 0
                const classPct = stats.total > 0 ? Math.round((stats.classComplete / stats.total) * 100) : 0
                return (
                  <div key={subject} style={{ padding: '0.875rem 1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{subject}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '0.375rem' }}>
                      {stats.total} chapters total
                    </div>
                    <div style={{ marginBottom: '0.375rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.125rem' }}>
                        🎬 Video: {stats.videoComplete}/{stats.total} ({videoPct}%)
                      </div>
                      <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${videoPct}%`, height: '100%', background: 'var(--color-success)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.125rem' }}>
                        📖 Class: {stats.classComplete}/{stats.total} ({classPct}%)
                      </div>
                      <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${classPct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Subject</th>
                    <th>Chapter</th>
                    <th style={{ textAlign: 'center' }}>🎬 Video</th>
                    <th>Video Date</th>
                    <th style={{ textAlign: 'center' }}>📖 Class</th>
                    <th>Class Date</th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.sort((a, b) => a.subject.localeCompare(b.subject) || a.chapterOrder - b.chapterOrder).map((c) => (
                    <tr key={c._id}>
                      <td style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>{c.chapterOrder || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{c.subject}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{c.chapterName}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${c.videoComplete ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.7rem' }}>
                          {c.videoComplete ? '✓' : '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{fmtDate(c.videoCompletedAt)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${c.facultyClassDone ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                          {c.facultyClassDone ? '✓' : '—'}
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
    </div>
  )
}
