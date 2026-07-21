import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { VideoCell } from './VideoCell'
import { MONTH, fmt } from './types'
import type { ChapterRow } from './types'

interface ChaptersTableProps {
  loading: boolean
  filtered: ChapterRow[]
  totalCount: number
  canMarkVideo: boolean
  canMarkClass: boolean
  saving: Record<string, boolean>
  onSaveVideoProgress: (row: ChapterRow, watched: number) => void
  onToggleFacultyClass: (row: ChapterRow) => void
}

export function ChaptersTable({
  loading, filtered, totalCount, canMarkVideo, canMarkClass, saving, onSaveVideoProgress, onToggleFacultyClass,
}: ChaptersTableProps) {
  return (
    <div className="card">
      {loading ? (
        <SkeletonTable rows={7} cols={7} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📚"
          title={totalCount === 0 ? 'No chapters found' : 'No chapters match the filter'}
          description={totalCount === 0
            ? 'Select a batch to view the syllabus chapter list.'
            : 'Try selecting a different subject.'}
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Month</th>
                <th>Subject</th>
                <th>Chapter</th>
                <th style={{ textAlign: 'center' }}>🎬 Videos watched</th>
                <th style={{ textAlign: 'center', fontSize: '0.75rem' }}>Video date</th>
                <th style={{ textAlign: 'center' }}>📖 Class done</th>
                <th style={{ textAlign: 'center', fontSize: '0.75rem' }}>Class date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ch) => (
                <tr key={ch._id} style={{ opacity: ch.isStub ? 0.7 : 1 }}>
                  <td style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>{ch.chapterOrder || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                    {ch.scheduledMonth ? MONTH[ch.scheduledMonth] : '—'}
                  </td>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{ch.subject}</td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{ch.chapterName}</td>

                  <VideoCell
                    row={ch}
                    canEdit={canMarkVideo}
                    saving={!!saving[ch._id]}
                    onSave={(n) => onSaveVideoProgress(ch, n)}
                  />

                  <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    {fmt(ch.videoCompletedAt)}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {canMarkClass && !ch.isStub ? (
                      <button
                        className={`btn btn-sm ${ch.facultyClassDone ? 'btn-success' : 'btn-outline'}`}
                        style={{ minWidth: 64, fontSize: '0.75rem' }}
                        disabled={!!saving[ch._id]}
                        onClick={() => onToggleFacultyClass(ch)}
                        title={ch.facultyClassDone ? 'Mark class as not done' : 'Mark class as done'}
                      >
                        {ch.facultyClassDone ? '✓ Done' : 'Pending'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8125rem' }}>
                        {ch.facultyClassDone ? '✓' : ch.isStub ? '—' : '–'}
                      </span>
                    )}
                  </td>

                  <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    {fmt(ch.facultyClassDoneAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
