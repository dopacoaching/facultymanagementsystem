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
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 460, border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontWeight: 700, margin: 0 }}>Add Special Day</h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{fmtDate(selectedDate)}</p>
          </div>
          <button onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
            {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
