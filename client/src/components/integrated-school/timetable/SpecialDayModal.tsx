import { ErrorAlert } from '@/components/ui/Skeleton'
import { SPECIAL_DAY_TYPES, fmtDate } from './types'

export interface SpecialDayForm {
  type:     string
  campusId: string
  notes:    string
}

interface Campus {
  _id: string
  name: string
}

interface SpecialDayModalProps {
  selectedDate: string
  form: SpecialDayForm
  setForm: (updater: (f: SpecialDayForm) => SpecialDayForm) => void
  campuses: Campus[]
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function SpecialDayModal({
  selectedDate, form, setForm, campuses, error, saving, onClose, onSubmit,
}: SpecialDayModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Add Special Day"
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <h2>Add Special Day</h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{fmtDate(selectedDate)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="modal-close">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {error && <div style={{ marginBottom: '0.75rem' }}><ErrorAlert message={error} /></div>}
          <div className="form-group">
            <label className="label">Type</label>
            <select className="input" value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {SPECIAL_DAY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Campus (leave blank for All IG Campuses)</label>
            <select className="input" value={form.campusId}
              onChange={(e) => setForm((f) => ({ ...f, campusId: e.target.value }))}>
              <option value="">All IG Campuses</option>
              {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Notes (optional)</label>
            <input className="input" value={form.notes} placeholder="e.g. Monthly test"
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" /> Saving…</> : 'Add'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
