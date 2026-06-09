'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, create, update } from '@/services/faculty.service'
import { getContract, updateContract } from '@/services/salary.service'
import type { Faculty } from '@/types'
import type { FacultyContract } from '@/services/salary.service'
import { Skeleton, ErrorAlert, EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

const SALARY_MODELS = ['HOURLY', 'FIXED_MONTHLY', 'FIXED_WITH_QUOTA', 'SPLIT_FIXED_VARIABLE', 'CONFIGURABLE']
const TYPES = ['PERMANENT', 'TEMPORARY', 'REGULAR', 'VISITING', 'CONTRACTUAL']

const EMPTY: Omit<Faculty, '_id'> = {
  name: '', subject: '', type: 'PERMANENT', salaryModel: 'HOURLY', isActive: true,
}

// ── Salary fields shown per model ──────────────────────────────────────────────

function SalaryFields({ editing, setEditing }: {
  editing: Partial<Faculty>
  setEditing: (f: Partial<Faculty>) => void
}) {
  const model = editing.salaryModel ?? ''
  const set = (key: keyof Faculty, val: unknown) => setEditing({ ...editing, [key]: val })

  if (model === 'HOURLY') {
    return (
      <div className="form-group">
        <label className="label">Hourly Rate (₹)</label>
        <input type="number" className="input" value={editing.hourlyRate ?? ''} onChange={(e) => set('hourlyRate', +e.target.value)} placeholder="e.g. 850" />
      </div>
    )
  }

  if (model === 'FIXED_MONTHLY') {
    return (
      <>
        <div className="form-group">
          <label className="label">Fixed Monthly Salary (₹)</label>
          <input type="number" className="input" value={editing.fixedMonthlySalary ?? ''} onChange={(e) => set('fixedMonthlySalary', +e.target.value)} placeholder="e.g. 40000" />
        </div>
        <div className="form-group">
          <label className="label">Monthly Leave Allowance (days)</label>
          <input type="number" className="input" value={editing.monthlyLeaveAllowance ?? ''} onChange={(e) => set('monthlyLeaveAllowance', +e.target.value)} placeholder="e.g. 8" />
        </div>
        <div className="form-group">
          <label className="label">April Leave Allowance (days)</label>
          <input type="number" className="input" value={editing.aprilLeaveAllowance ?? ''} onChange={(e) => set('aprilLeaveAllowance', +e.target.value)} placeholder="e.g. 4" />
        </div>
      </>
    )
  }

  if (model === 'FIXED_WITH_QUOTA') {
    return (
      <>
        <div className="form-group">
          <label className="label">Fixed Monthly Salary (₹)</label>
          <input type="number" className="input" value={editing.fixedMonthlySalary ?? ''} onChange={(e) => set('fixedMonthlySalary', +e.target.value)} placeholder="e.g. 50000" />
        </div>
        <div className="form-group">
          <label className="label">Monthly Hour Quota</label>
          <input type="number" className="input" value={editing.monthlyHourQuota ?? ''} onChange={(e) => set('monthlyHourQuota', +e.target.value)} placeholder="e.g. 60" />
        </div>
      </>
    )
  }

  if (model === 'SPLIT_FIXED_VARIABLE') {
    return (
      <>
        <div className="form-group">
          <label className="label">Fixed Component (₹)</label>
          <input type="number" className="input" value={editing.fixedComponent ?? ''} onChange={(e) => set('fixedComponent', +e.target.value)} placeholder="e.g. 50000" />
        </div>
        <div className="form-group">
          <label className="label">Variable Component (₹)</label>
          <input type="number" className="input" value={editing.variableComponent ?? ''} onChange={(e) => set('variableComponent', +e.target.value)} placeholder="e.g. 150000" />
        </div>
      </>
    )
  }

  if (model === 'CONFIGURABLE') {
    return (
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <div className="alert alert-warning" style={{ marginBottom: 0 }}>
          <span className="alert-icon">⚙️</span>
          <div>
            <strong>CONFIGURABLE Model</strong>
            <div style={{ fontWeight: 400, marginTop: '0.2rem' }}>
              Use the <strong>Configure Pay</strong> button in the faculty list to set this faculty&#39;s pay configuration JSON.
              Salary calculation will be blocked until configured.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ── Configure-Pay Modal (for CONFIGURABLE faculty) ────────────────────────────

function ConfigurePayModal({
  faculty,
  token,
  onClose,
  onSaved,
}: {
  faculty: Faculty
  token: string
  onClose: () => void
  onSaved: () => void
}) {
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
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 60, padding: '1rem',
    }}>
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', padding: '0.25rem', lineHeight: 1 }}>×</button>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FacultyPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const [list, setList]         = useState<Faculty[]>([])
  const [editing, setEditing]   = useState<(Faculty | typeof EMPTY) | null>(null)
  const [configuring, setConfiguring] = useState<Faculty | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')

  const load = useCallback(() => {
    if (accessToken) getAll(accessToken, true).then(setList).catch(console.error)
  }, [accessToken])

  useEffect(load, [load])

  const filtered = list.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.subject.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    if (!accessToken || !editing) return
    setSaving(true); setError('')
    try {
      if ('_id' in editing) {
        await update(editing._id, editing as Partial<Faculty>, accessToken)
        toast.success('Faculty updated', 'Changes have been saved.')
      } else {
        await create(editing as Omit<Faculty, '_id'>, accessToken)
        toast.success('Faculty added', 'New faculty member has been created.')
      }
      setEditing(null); load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Faculty</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {list.length} faculty member{list.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing(EMPTY)}>
          + Add Faculty
        </button>
      </div>

      <div className="card">
        {/* Search bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', maxWidth: 360 }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }}>🔍</span>
            <input className="input" placeholder="Search by name or subject…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="👥"
            title={search ? 'No results found' : 'No faculty added yet'}
            description={search ? `No faculty match "${search}". Try a different search term.` : 'Add your first faculty member to get started with payroll and scheduling.'}
            action={search ? undefined : { label: '+ Add Faculty', onClick: () => setEditing(EMPTY) }}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Salary Model</th>
                  <th>Status</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                          {f.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{f.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{f.subject}</td>
                    <td><span className="badge badge-gray">{f.type}</span></td>
                    <td>
                      <span className={`badge ${f.salaryModel === 'CONFIGURABLE' ? 'badge-yellow' : 'badge-indigo'}`}>
                        {f.salaryModel.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${f.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {f.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        {f.salaryModel === 'CONFIGURABLE' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setConfiguring(f)}
                            style={{ fontSize: '0.75rem' }}
                            title="Configure pay JSON for CONFIGURABLE salary model"
                          >
                            ⚙️ Configure Pay
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(f)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit / Add Modal ── */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--color-border)' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, margin: 0 }}>{'_id' in editing ? 'Edit Faculty' : 'Add Faculty'}</h2>
              <button onClick={() => { setEditing(null); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', padding: '0.25rem', lineHeight: 1 }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{ marginBottom: '1rem' }}>
                  <ErrorAlert message={error} />
                </div>
              )}

              <div className="input-group">
                {/* Name */}
                <div className="form-group">
                  <label className="label">Full Name</label>
                  <input className="input" value={(editing as Faculty).name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Full name" />
                </div>

                {/* Subject */}
                <div className="form-group">
                  <label className="label">Subject</label>
                  <input className="input" value={(editing as Faculty).subject ?? ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} placeholder="e.g. Physics" />
                </div>

                {/* Employment Type */}
                <div className="form-group">
                  <label className="label">Employment Type</label>
                  <select className="input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* Salary Model */}
                <div className="form-group">
                  <label className="label">Salary Model</label>
                  <select className="input" value={editing.salaryModel} onChange={(e) => setEditing({ ...editing, salaryModel: e.target.value })}>
                    {SALARY_MODELS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>

                {/* Salary-model-specific fields */}
                <SalaryFields editing={editing as Faculty} setEditing={(f) => setEditing(f as Faculty)} />

                {/* Active toggle */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                    <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                    Active (uncheck to deactivate)
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => { setEditing(null); setError('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff', width: '0.8rem', height: '0.8rem' }} /> Saving…</> : ('_id' in editing ? 'Save Changes' : 'Add Faculty')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Configure-Pay Modal ── */}
      {configuring && accessToken && (
        <ConfigurePayModal
          faculty={configuring}
          token={accessToken}
          onClose={() => setConfiguring(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
