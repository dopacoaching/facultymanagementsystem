'use client'
import { useState } from 'react'
import PasswordInput from '@/components/ui/PasswordInput'
import { useAppSelector } from '@/store/hooks'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useToast } from '@/components/ui/Toast'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { Icon } from '@/components/ui/Icon'
import rs from '@/components/hr/reports/Reports.module.css'
import { createCampus, getCampuses, updateCampus, type SetupCampus } from '@/services/setup.service'

interface FormState {
  name: string
  kind: 'CAMPUS' | 'IG'
  hasBatches: boolean
  hasEntryTypes: boolean
  location: string
  teachers: string
  username: string
  password: string
}

const EMPTY: FormState = { name: '', kind: 'CAMPUS', hasBatches: false, hasEntryTypes: false, location: '', teachers: '', username: '', password: '' }

export default function CampusesSetupPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const res = useAsyncResource(() => getCampuses(accessToken!), [accessToken], { enabled: !!accessToken })
  const [editing, setEditing] = useState<SetupCampus | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const campuses = res.data ?? []

  function openNew() {
    setForm(EMPTY); setError(''); setEditing('new')
  }
  function openEdit(c: SetupCampus) {
    setForm({ ...EMPTY, name: c.name, kind: c.kind, hasBatches: c.hasBatches, hasEntryTypes: c.hasEntryTypes, username: c.login?.username ?? '' })
    setError(''); setEditing(c)
  }
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    if (!accessToken || !editing) return
    setError('')
    if (form.name.trim().length < 2) { setError('Enter the campus name'); return }
    setSaving(true)
    try {
      if (editing === 'new') {
        if (!form.username.trim()) { setError('Enter a login username'); setSaving(false); return }
        if (!form.password) { setError('Enter a password for the login'); setSaving(false); return }
        await createCampus({
          name: form.name.trim(),
          kind: form.kind,
          hasBatches: form.kind === 'IG' || form.hasBatches,
          hasEntryTypes: form.kind === 'CAMPUS' && form.hasEntryTypes,
          location: form.location.trim() || undefined,
          teachers: form.teachers.split('\n').map((t) => t.trim()).filter(Boolean),
          username: form.username.trim(),
          password: form.password,
        }, accessToken)
        toast.success('Campus added', `${form.name.trim()} can now sign in and push entries.`)
      } else {
        const patch: Parameters<typeof updateCampus>[1] = {}
        if (form.name.trim() !== editing.name) patch.name = form.name.trim()
        if (form.username.trim() && form.username.trim().toLowerCase() !== editing.login?.username) patch.username = form.username.trim()
        if (form.password) patch.password = form.password
        if (form.hasBatches && !editing.hasBatches) patch.hasBatches = true
        if (editing.kind === 'CAMPUS' && form.hasEntryTypes !== editing.hasEntryTypes) patch.hasEntryTypes = form.hasEntryTypes
        if (Object.keys(patch).length === 0) { setEditing(null); setSaving(false); return }
        await updateCampus(editing._id, patch, accessToken)
        toast.success('Campus updated', 'Changes have been saved.')
      }
      setEditing(null)
      res.refetch()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function toggle(c: SetupCampus) {
    if (!accessToken) return
    const next = !c.isActive
    if (!next && !window.confirm(`Deactivate ${c.name}? Its login stops working and it disappears from Push Board lists. Past entries stay.`)) return
    try {
      await updateCampus(c._id, { isActive: next }, accessToken)
      toast.success(next ? 'Campus activated' : 'Campus deactivated', c.name)
      res.refetch()
    } catch (e: unknown) {
      toast.error('Could not update', e instanceof Error ? e.message : undefined)
    }
  }

  const isNew = editing === 'new'

  /** Campuses and IG schools are separate sections; empty ones are hidden. */
  const sections = [
    { key: 'CAMPUS', title: 'Campuses', items: campuses.filter((c) => c.kind !== 'IG') },
    { key: 'IG', title: 'IG schools', items: campuses.filter((c) => c.kind === 'IG') },
  ].filter((g) => g.items.length > 0)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Campuses</h1>
          <p className="page-subtitle">Campuses and IG schools that push entries. Each has a shared teacher login.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Icon name="plus" size={16} /> Add Campus
          </button>
        </div>
      </div>

      {res.status === 'error' && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ErrorAlert message={res.error?.message ?? ''} what="Couldn't load campuses" onRetry={res.refetch} />
        </div>
      )}

      {res.status === 'loading' ? (
        <div className="card card-flush"><SkeletonTable rows={6} cols={6} /></div>
      ) : campuses.length === 0 ? (
        <div className="card">
          <EmptyState title="No campuses yet" description="Add the first campus to start collecting entries." action={{ label: '+ Add Campus', onClick: openNew }} />
        </div>
      ) : (
        sections.map((g) => (
          <section key={g.key} className={`card card-flush ${rs.setupGroup}`} aria-label={g.title}>
            <div className="card-header">
              <h2 className={rs.setupTitle}><Icon name={g.key === 'IG' ? 'school' : 'building'} size={18} /> {g.title}</h2>
              <span className="badge badge-gray"><span className="mono">{g.items.length}</span> total</span>
            </div>
            <div className="table-wrapper table-stack" style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Campus</th>
                    <th>Login</th>
                    <th className="num" style={{ textAlign: 'right' }}>Teachers</th>
                    <th className="num" style={{ textAlign: 'right' }}>Batches</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}><span className={rs.srOnly}>Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((c) => (
                    <tr key={c._id} className={c.isActive ? undefined : rs.dim}>
                      <td data-label="Campus" className={rs.strong}>{c.name}</td>
                      <td data-label="Login" className={`${rs.mono} ${rs.muted}`}>{c.login?.username ?? '—'}</td>
                      <td data-label="Teachers" className="num" style={{ textAlign: 'right' }}>{c.teachers.filter((t) => t.isActive).length}</td>
                      <td data-label="Batches" className="num" style={{ textAlign: 'right' }}>{c.hasBatches ? c.batchCount : '—'}</td>
                      <td data-label="Status"><span className={`badge badge-dot ${c.isActive ? 'badge-green' : 'badge-gray'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div className={rs.rowActions}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>
                            <Icon name="edit" size={14} /> Edit
                          </button>
                          <button type="button" className={`btn btn-sm ${c.isActive ? 'btn-danger-ghost' : 'btn-outline'}`} onClick={() => toggle(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {editing && (
        <div
          role="dialog" aria-modal="true" aria-label={isNew ? 'Add campus' : 'Edit campus'}
          className="modal-backdrop"
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null) }}
        >
          <div className="modal-panel modal-md">
            <div className="modal-header">
              <h2>{isNew ? 'Add Campus' : 'Edit Campus'}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="modal-close"><Icon name="x" size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save() }}>
              <div className="modal-body form-stack">
                {error && <ErrorAlert message={error} />}

                <FormField label="Campus name" htmlFor="cs-name" required hint={isNew ? undefined : 'Renaming updates past entries, No Class days and the login too.'}>
                  <input id="cs-name" className="input" autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Kottakkal Offline" />
                </FormField>

                {isNew && (
                  <FormField label="Type" htmlFor="cs-kind">
                    <select id="cs-kind" className="input" value={form.kind} onChange={(e) => set('kind', e.target.value as FormState['kind'])}>
                      <option value="CAMPUS">Campus</option>
                      <option value="IG">IG school</option>
                    </select>
                  </FormField>
                )}

                {((isNew ? form.kind === 'CAMPUS' : !editing.hasBatches) || (isNew ? form.kind === 'CAMPUS' : editing.kind === 'CAMPUS')) && (
                  <fieldset className="form-stack" style={{ border: 0, padding: 0, margin: 0, gap: 'var(--space-3)' }}>
                    <legend className="label">Options</legend>
                    {(isNew ? form.kind === 'CAMPUS' : !editing.hasBatches) && (
                      <label className={rs.formCheck}>
                        <input type="checkbox" checked={form.hasBatches} onChange={(e) => set('hasBatches', e.target.checked)} />
                        This campus runs batches (teachers pick the batch on the Push Board)
                      </label>
                    )}
                    {(isNew ? form.kind === 'CAMPUS' : editing.kind === 'CAMPUS') && (
                      <label className={rs.formCheck}>
                        <input type="checkbox" checked={form.hasEntryTypes} onChange={(e) => set('hasEntryTypes', e.target.checked)} />
                        Entries are Live or Shoot (Shoot hours count 1.75×)
                      </label>
                    )}
                  </fieldset>
                )}

                {isNew && form.hasBatches || (isNew && form.kind === 'IG') ? (
                  <FormField label="Location" htmlFor="cs-loc" hint="Optional">
                    <input id="cs-loc" className="input" value={form.location} onChange={(e) => set('location', e.target.value)} />
                  </FormField>
                ) : null}

                {isNew && (
                  <FormField label="Teacher names" htmlFor="cs-teachers" hint="One per line. Shown in the “Updated by” dropdown. You can change them later under Teachers.">
                    <textarea id="cs-teachers" className="input" rows={4} value={form.teachers} onChange={(e) => set('teachers', e.target.value)} />
                  </FormField>
                )}

                <div className="card card-quiet form-stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-4)' }}>
                  <h3 style={{ fontSize: 'var(--text-md)', margin: 0 }}>Shared login</h3>
                  <FormField label="Login username" htmlFor="cs-user" required hint="The shared account this campus signs in with (an email works)">
                    <input id="cs-user" className="input" autoComplete="off" value={form.username} onChange={(e) => set('username', e.target.value)} />
                  </FormField>
                  <FormField
                    label={isNew ? 'Login password' : 'Reset password'}
                    htmlFor="cs-pass"
                    required={isNew}
                    hint={isNew ? '8+ characters with upper, lower, digit and special character' : 'Leave blank to keep the current password'}
                  >
                    <PasswordInput id="cs-pass" showStrength={false} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
                  </FormField>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner spinner-on-solid" /> Saving…</> : (isNew ? 'Add Campus' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
