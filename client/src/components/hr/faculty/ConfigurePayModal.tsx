import { useEffect, useState } from 'react'
import type { Faculty } from '@/types'
import { getContract, updateContract } from '@/services/salary.service'
import type { FacultyContract } from '@/services/salary.service'
import { Skeleton, ErrorAlert } from '@/components/ui/Skeleton'

interface ConfigurePayModalProps {
  faculty: Faculty
  token: string
  onClose: () => void
  onSaved: () => void
}

export function ConfigurePayModal({ faculty, token, onClose, onSaved }: ConfigurePayModalProps) {
  const [contract, setContract] = useState<FacultyContract | null>(null)
  const [jsonText, setJsonText] = useState('')
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [jsonError, setJsonError] = useState('')

  useEffect(() => {
    getContract(faculty._id, token)
      .then((c) => {
        setContract(c)
        setJsonText(c.configurablePayJson ? JSON.stringify(c.configurablePayJson, null, 2) : '{}')
        setNotes(c.notes ?? '')
      })
      .catch(() => setError('Could not load contract'))
      .finally(() => setLoading(false))
  }, [faculty._id, token])

  function validateJson(): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonError('')
      return parsed
    } catch {
      setJsonError('Invalid JSON — please fix syntax errors')
      return null
    }
  }

  async function handleSave() {
    const parsed = validateJson()
    if (!parsed) return
    setSaving(true); setError('')
    try {
      await updateContract(faculty._id, {
        configurablePayJson: parsed,
        isConfigured: Object.keys(parsed).length > 0,
        notes: notes || undefined,
      }, token)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Configure Pay"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 60, padding: '1rem',
      }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Configure Pay — {faculty.name}</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>CONFIGURABLE contract type</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', padding: '0.25rem', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Skeleton height="1.5rem" width="60%" />
              <Skeleton height="1rem" width="40%" />
              <Skeleton height="8rem" />
              <Skeleton height="4rem" />
            </div>
          )}

          {error && (
            <div style={{ marginBottom: '1rem' }}>
              <ErrorAlert message={error} />
            </div>
          )}

          {!loading && contract && (
            <>
              {/* Status */}
              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>Contract status:</span>
                <span className={`badge ${contract.isConfigured ? 'badge-green' : 'badge-red'}`}>
                  {contract.isConfigured ? 'Configured' : 'Not Configured — payroll BLOCKED'}
                </span>
              </div>

              {/* JSON editor */}
              <div className="form-group">
                <label className="label">Pay Configuration JSON</label>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                  Enter the pay structure as a JSON object. Example: <code style={{ background: 'var(--color-surface-2)', padding: '0.1rem 0.3rem', borderRadius: 3 }}>{`{"baseSalary": 45000, "bonus": 5000}`}</code>
                </div>
                <textarea
                  className="input"
                  value={jsonText}
                  onChange={(e) => { setJsonText(e.target.value); setJsonError('') }}
                  onBlur={validateJson}
                  style={{
                    fontFamily: 'monospace', fontSize: '0.8125rem',
                    minHeight: 180, resize: 'vertical',
                    borderColor: jsonError ? 'var(--color-danger)' : undefined,
                  }}
                  spellCheck={false}
                />
                {jsonError && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '0.25rem' }}>⚠ {jsonError}</div>
                )}
              </div>

              {/* Notes */}
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ minHeight: 64, resize: 'vertical' }}
                  placeholder="e.g. Custom arrangement as per agreement letter dated…"
                />
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading || !!jsonError}>
            {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff', width: '0.8rem', height: '0.8rem' }} /> Saving…</> : '⚙️ Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}
