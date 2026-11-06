import { Icon } from '@/components/ui/Icon'
import { useEffect, useState } from 'react'
import type { Faculty } from '@/types'
import { getContract, updateContract } from '@/services/salary.service'
import type { FacultyContract } from '@/services/salary.service'
import { Skeleton, ErrorAlert } from '@/components/ui/Skeleton'
import s from './Faculty.module.css'

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
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="modal-panel modal-md">
        <div className="modal-header">
          <div>
            <h2>Configure Pay — {faculty.name}</h2>
            <div className={s.subtitle}>CONFIGURABLE contract type</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="modal-close"><Icon name="x" size={16} /></button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="stack-sm">
              <Skeleton height="1.5rem" width="60%" />
              <Skeleton height="1rem" width="40%" />
              <Skeleton height="8rem" />
              <Skeleton height="4rem" />
            </div>
          )}

          {error && (
            <div className="mb-4">
              <ErrorAlert message={error} />
            </div>
          )}

          {!loading && contract && (
            <>
              <section className={s.section} aria-labelledby="cp-status">
                <h3 id="cp-status" className={s.sectionTitle}>Contract status</h3>
                <div className={s.statusRow}>
                  <span className={`badge badge-dot ${contract.isConfigured ? 'badge-green' : 'badge-red'}`}>
                    {contract.isConfigured ? 'Configured' : 'Not Configured — payroll BLOCKED'}
                  </span>
                </div>
              </section>

              <section className={s.section} aria-labelledby="cp-json">
                <h3 id="cp-json" className={s.sectionTitle}>Pay structure</h3>
                <div className="form-group">
                  <label className="label" htmlFor="cp-json-input">Pay Configuration JSON</label>
                  <div className="help-text" style={{ marginTop: 0 }}>
                    Enter the pay structure as a JSON object. Example: <code className={s.codeInline}>{`{"baseSalary": 45000, "bonus": 5000}`}</code>
                  </div>
                  <textarea
                    id="cp-json-input"
                    className={`input ${s.jsonArea}`}
                    value={jsonText}
                    onChange={(e) => { setJsonText(e.target.value); setJsonError('') }}
                    onBlur={validateJson}
                    aria-invalid={jsonError ? true : undefined}
                    spellCheck={false}
                  />
                  {jsonError && <div className="error-text" role="alert">{jsonError}</div>}
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="cp-notes">Notes (optional)</label>
                  <textarea
                    id="cp-notes"
                    className="input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Custom arrangement as per agreement letter dated…"
                  />
                </div>
              </section>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || loading || !!jsonError}>
            {saving ? <><span className="spinner" /> Saving…</> : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}
