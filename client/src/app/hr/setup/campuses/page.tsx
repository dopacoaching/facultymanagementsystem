'use client'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useToast } from '@/components/ui/Toast'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { createCampus, getCampuses, updateCampus, type SetupCampus } from '@/services/setup.service'

interface FormState {
  name: string
  kind: 'CAMPUS' | 'IG'
  hasBatches: boolean
  location: string
  teachers: string
  username: string
  password: string
}

const EMPTY: FormState = { name: '', kind: 'CAMPUS', hasBatches: false, location: '', teachers: '', username: '', password: '' }

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
    setForm({ ...EMPTY, name: c.name, kind: c.kind, hasBatches: c.hasBatches, username: c.login?.username ?? '' })
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Campuses</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Campuses and IG schools that push entries. Each has a shared teacher login.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>+ Add Campus</button>
      </div>

      {res.status === 'error' && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={res.error?.message ?? ''} what="Couldn't load campuses" onRetry={res.refetch} />
        </div>
      )}

      <div className="card">
        {res.status === 'loading' ? (
          <SkeletonTable rows={6} cols={6} />
        ) : campuses.length === 0 ? (
          <EmptyState title="No campuses yet" description="Add the first campus to start collecting entries." action={{ label: '+ Add Campus', onClick: openNew }} />
        ) : (
          <div className="table-wrapper">
            <table style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Campus</th>
                  <th>Type</th>
                  <th>Login</th>
                  <th style={{ textAlign: 'right' }}>Teachers</th>
                  <th style={{ textAlign: 'right' }}>Batches</th>
                  <th>Status</th>
                  <th style={{ width: 150, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campuses.map((c) => (
                  <tr key={c._id} style={{ opacity: c.isActive ? 1 : 0.6 }}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.kind === 'IG' ? 'IG school' : 'Campus'}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{c.login?.username ?? '—'}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.teachers.filter((t) => t.isActive).length}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.hasBatches ? c.batchCount : '—'}</td>
                    <td><span className={`badge ${c.isActive ? 'badge-green' : 'badge-gray'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div
          role="dialog" aria-modal="true" aria-label={isNew ? 'Add campus' : 'Edit campus'}
          className="modal-backdrop"
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null) }}
        >
          <div className="modal-panel modal-md">
            <div className="modal-header">
              <h2>{isNew ? 'Add Campus' : 'Edit Campus'}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="modal-close">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save() }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

                {(isNew ? form.kind === 'CAMPUS' : !editing.hasBatches) && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={form.hasBatches} onChange={(e) => set('hasBatches', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                    This campus runs batches (teachers pick the batch on the Push Board)
                  </label>
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

                <FormField label="Login username" htmlFor="cs-user" required hint="The shared account this campus signs in with (an email works)">
                  <input id="cs-user" className="input" autoComplete="off" value={form.username} onChange={(e) => set('username', e.target.value)} />
                </FormField>
                <FormField
                  label={isNew ? 'Login password' : 'Reset password'}
                  htmlFor="cs-pass"
                  required={isNew}
                  hint={isNew ? '8+ characters with upper, lower, digit and special character' : 'Leave blank to keep the current password'}
                >
                  <input id="cs-pass" type="password" className="input" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
                </FormField>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving…</> : (isNew ? 'Add Campus' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
