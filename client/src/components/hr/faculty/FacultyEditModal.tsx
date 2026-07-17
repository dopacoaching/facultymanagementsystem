import type { Faculty } from '@/types'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { SalaryFields } from './SalaryFields'
import { EMPTY_FACULTY, SALARY_MODELS, TYPES } from './types'

interface FacultyEditModalProps {
  editing: Faculty | typeof EMPTY_FACULTY
  setEditing: (f: Faculty | typeof EMPTY_FACULTY) => void
  error: string
  saving: boolean
  onClose: () => void
  onSave: () => void
}

export function FacultyEditModal({ editing, setEditing, error, saving, onClose, onSave }: FacultyEditModalProps) {
  const isEdit = '_id' in editing

  return (
    <div
      role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Faculty' : 'Add Faculty'}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, margin: 0 }}>{isEdit ? 'Edit Faculty' : 'Add Faculty'}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', padding: '0.25rem', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{ marginBottom: '1rem' }}>
              <ErrorAlert message={error} />
            </div>
          )}

          <div className="input-group">
            <div className="form-group">
              <label className="label">Full Name</label>
              <input className="input" autoFocus value={(editing as Faculty).name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Full name" />
            </div>

            <div className="form-group">
              <label className="label">Subject</label>
              <input className="input" value={(editing as Faculty).subject ?? ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} placeholder="e.g. Physics" />
            </div>

            <div className="form-group">
              <label className="label">Employment Type</label>
              <select className="input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Salary Model</label>
              <select className="input" value={editing.salaryModel} onChange={(e) => setEditing({ ...editing, salaryModel: e.target.value })}>
                {SALARY_MODELS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>

            <SalaryFields editing={editing as Faculty} setEditing={(f) => setEditing(f as Faculty)} />

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                Active (uncheck to deactivate)
              </label>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff', width: '0.8rem', height: '0.8rem' }} /> Saving…</> : (isEdit ? 'Save Changes' : 'Add Faculty')}
          </button>
        </div>
      </div>
    </div>
  )
}
