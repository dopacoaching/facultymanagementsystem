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
          <button type="button" onClick={onBack} aria-label="Close" className="modal-close" disabled={saving}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Check every detail below. You can edit an entry for 24 hours after pushing it, but HR sees it straight away.
          </p>
          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.5rem 1rem', margin: 0, fontSize: '0.875rem' }}>
            {rows.map((r) => (
              <div key={r.label} style={{ display: 'contents' }}>
                <dt style={{ color: 'var(--color-muted)' }}>{r.label}</dt>
                <dd style={{ margin: 0, fontWeight: 600, overflowWrap: 'anywhere' }}>{r.value || '—'}</dd>
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
