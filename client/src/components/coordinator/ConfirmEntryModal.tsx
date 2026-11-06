import { Icon } from '@/components/ui/Icon'
import s from './Entry.module.css'

/** Rows whose values are times, dates or durations — shown in the mono face. */
const MONO_LABELS = new Set(['Time', 'Total hours', 'Date'])

/** "Verify your entry" — shown before a new entry is saved so the teacher can check it. */
export function ConfirmEntryModal({ rows, saving, onConfirm, onBack }: {
  rows: { label: string; value: string }[]
  saving: boolean
  onConfirm: () => void
  onBack: () => void
}) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Verify your entry"
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape' && !saving) onBack() }}
    >
      <div className="modal-panel modal-md">
        <div className="modal-header">
          <h2>Verify your entry</h2>
          <button type="button" onClick={onBack} aria-label="Close" className="modal-close" disabled={saving}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className={s.modalLead}>
            Check every detail below. You can edit an entry for 24 hours after pushing it, but HR sees it straight away.
          </p>
          <dl className={s.summary}>
            {rows.map((r) => (
              <div key={r.label} className={s.summaryRow}>
                <dt>{r.label}</dt>
                <dd className={MONO_LABELS.has(r.label) ? s.mono : undefined}>{r.value || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onBack} disabled={saving}>Go back &amp; edit</button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={saving}>
            {saving ? <><span className="spinner spinner-on-solid" /> Saving…</> : 'Confirm & submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
