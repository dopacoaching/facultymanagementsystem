import { Icon } from '@/components/ui/Icon'
import { useState } from 'react'
import type { Faculty } from '@/types'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { SalaryFields } from './SalaryFields'
import { EMPTY_FACULTY, SALARY_MODELS, TYPES } from './types'
import s from './Faculty.module.css'

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
  // The rate as loaded, so SalaryFields can tell when it has been changed.
  const [originalRate] = useState(() => ('_id' in editing ? editing.hourlyRate : undefined))

  return (
    <div
      role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Faculty' : 'Add Faculty'}
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="modal-panel modal-md">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Faculty' : 'Add Faculty'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="modal-close"><Icon name="x" size={16} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave() }} style={{ display: 'contents' }}>
        <div className="modal-body">
          {error && (
            <div className="mb-4">
              <ErrorAlert message={error} />
            </div>
          )}

          <section className={s.section} aria-labelledby="fac-profile">
            <h3 id="fac-profile" className={s.sectionTitle}>Profile</h3>
            <div className="input-group">
              <div className="form-group">
                <label className="label" htmlFor="fac-name">Full Name</label>
                <input id="fac-name" className="input" autoFocus value={(editing as Faculty).name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="fac-subject">Subject</label>
                <input id="fac-subject" className="input" value={(editing as Faculty).subject ?? ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} placeholder="e.g. Physics" />
              </div>
            </div>
            <label className={s.switchRow}>
              <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
              <span>
                Active (uncheck to deactivate)
              </span>
            </label>
          </section>

          <section className={s.section} aria-labelledby="fac-contract">
            <h3 id="fac-contract" className={s.sectionTitle}>Contract</h3>
            <div className="input-group">
              <div className="form-group">
                <label className="label" htmlFor="fac-type">Employment Type</label>
                <select id="fac-type" className="input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label" htmlFor="fac-model">Salary Model</label>
                <select id="fac-model" className="input" value={editing.salaryModel} onChange={(e) => setEditing({ ...editing, salaryModel: e.target.value })}>
                  {SALARY_MODELS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className={s.section} aria-labelledby="fac-rates">
            <h3 id="fac-rates" className={s.sectionTitle}>Rates</h3>
            <div className="input-group">
              <SalaryFields editing={editing as Faculty} setEditing={(f) => setEditing(f as Faculty)} originalRate={originalRate} />
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" /> Saving…</> : (isEdit ? 'Save Changes' : 'Add Faculty')}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
