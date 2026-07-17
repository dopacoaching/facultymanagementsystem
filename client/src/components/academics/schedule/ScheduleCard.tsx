import { ClassEntry, Schedule, SESSION_TYPE_BADGE, SESSION_TYPE_LABELS, DAY_LABELS, fmtDate, getBatchName, getFacultyName } from './types'

interface ScheduleCardProps {
  schedule: Schedule
  canEdit: boolean
  canPublish: boolean
  canRevise: boolean
  publishing: string
  revising: string
  deleting: string
  onEditDraft: (s: Schedule) => void
  onPublish: (id: string) => void
  onDeleteDraft: (id: string) => void
  onRevise: (id: string) => void
}

export function ScheduleCard({
  schedule: s, canEdit, canPublish, canRevise, publishing, revising, deleting,
  onEditDraft, onPublish, onDeleteDraft, onRevise,
}: ScheduleCardProps) {
  const bName   = getBatchName(s.batchId as string | { _id: string; name: string })
  const wStart  = fmtDate(s.weekStartDate)
  const wEnd    = s.weekEndDate ? fmtDate(s.weekEndDate) : '—'
  const isDraft = !s.isPublished

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${s.isPublished ? 'var(--color-success)' : s.isRevised ? 'var(--color-warning)' : 'var(--color-primary)'}`,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>{bName}</span>
            <span className={`badge ${s.isPublished ? 'badge-green' : s.isRevised ? 'badge-yellow' : 'badge-blue'}`}>
              {s.isPublished ? '✓ Published' : s.isRevised ? 'Revised Draft' : 'Draft'}
            </span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
            {wStart} → {wEnd}
            {s.publishedAt && <span style={{ marginLeft: '0.75rem' }}>Published {fmtDate(s.publishedAt)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
          {isDraft && (
            <>
              {canEdit && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => onEditDraft(s)}
                  style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                >
                  ✏ Edit Draft
                </button>
              )}
              {canPublish && (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={publishing === s._id}
                  onClick={() => onPublish(s._id)}
                >
                  {publishing === s._id ? 'Publishing…' : '📢 Publish'}
                </button>
              )}
              {canEdit && (
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={deleting === s._id}
                  onClick={() => onDeleteDraft(s._id)}
                  style={{ color: 'var(--color-danger)' }}
                >
                  {deleting === s._id ? 'Discarding…' : '✕ Discard'}
                </button>
              )}
            </>
          )}
          {s.isPublished && canRevise && (
            <button
              className="btn btn-outline btn-sm"
              disabled={revising === s._id}
              onClick={() => onRevise(s._id)}
              style={{ color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}
            >
              {revising === s._id ? 'Creating…' : '✏ Revise'}
            </button>
          )}
        </div>
      </div>

      {/* Class entries */}
      {s.classEntries.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
            Class Entries
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {s.classEntries.map((entry, i) => {
              const t = (entry as ClassEntry).sessionType
              const badge = SESSION_TYPE_BADGE[t] ?? { cls: 'badge-gray', icon: '📌' }
              const isExam = t === 'WEEKLY_EXAM' || t === 'MONTHLY_EXAM'
              const ce = entry as ClassEntry
              return (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem', padding: '0.5rem 0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontWeight: 600, minWidth: 80, color: 'var(--color-primary)', fontSize: '0.8125rem' }}>
                    {isExam && ce.examDate
                      ? fmtDate(ce.examDate)
                      : (DAY_LABELS[entry.day] ?? entry.day)}
                  </span>
                  <span className={`badge ${badge.cls}`} style={{ fontSize: '0.7rem' }}>
                    {badge.icon} {SESSION_TYPE_LABELS[t]}
                  </span>
                  {isExam && ce.examDay && (
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                      {DAY_LABELS[ce.examDay]}
                    </span>
                  )}
                  <span style={{ fontWeight: 500 }}>{entry.subject}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>— {entry.chapter}</span>
                  {!isExam && entry.facultyId && (
                    <span style={{ color: 'var(--color-muted)', marginLeft: 'auto', fontSize: '0.8125rem' }}>
                      👤 {getFacultyName(entry.facultyId as string | { _id: string; name: string })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
