import { fmt } from './types'
import type { Schedule } from './types'

interface ExamTopicCardProps {
  schedule: Schedule
  topic: { monday: string; friday: string }
  canEdit: boolean
  saving: boolean
  onFieldChange: (field: 'monday' | 'friday', val: string) => void
  onSave: () => void
}

export function ExamTopicCard({ schedule: s, topic: t, canEdit, saving, onFieldChange, onSave }: ExamTopicCardProps) {
  const hasTopics = t.monday.trim() || t.friday.trim()

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${s.isPublished ? 'var(--color-success)' : 'var(--color-primary)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontWeight: 700 }}>
            {fmt(s.weekStartDate)} – {fmt(s.weekEndDate)}
            <span className={`badge ${s.isPublished ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '0.7rem' }}>
              {s.isPublished ? '✓ Published' : 'Draft'}
            </span>
            {hasTopics && (
              <span className="badge badge-orange" style={{ fontSize: '0.7rem' }}>📝 Topics set</span>
            )}
          </div>
        </div>
      </div>

      {canEdit ? (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, flex: '1 1 220px' }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Monday Exam Topic</label>
            <input
              className="input"
              style={{ fontSize: '0.8125rem' }}
              placeholder="e.g. Kinematics + Laws of Motion"
              value={t.monday}
              onChange={(e) => onFieldChange('monday', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '1 1 220px' }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Friday Exam Topic</label>
            <input
              className="input"
              style={{ fontSize: '0.8125rem' }}
              placeholder="e.g. Thermodynamics + Waves"
              value={t.friday}
              onChange={(e) => onFieldChange('friday', e.target.value)}
            />
          </div>
          <button
            className="btn btn-outline btn-sm"
            disabled={saving}
            onClick={onSave}
            style={{ alignSelf: 'flex-end', flexShrink: 0 }}
          >
            {saving
              ? <><span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> Saving…</>
              : '💾 Save Topics'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {t.monday ? (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Monday Exam</div>
              <div style={{ fontWeight: 500 }}>{t.monday}</div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No Monday exam topic set.</div>
          )}
          {t.friday ? (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Friday Exam</div>
              <div style={{ fontWeight: 500 }}>{t.friday}</div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No Friday exam topic set.</div>
          )}
        </div>
      )}
    </div>
  )
}
