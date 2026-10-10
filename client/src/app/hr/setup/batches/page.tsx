'use client'
import { useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useToast } from '@/components/ui/Toast'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { createBatch, getBatches, updateBatch, type BatchType, type SetupBatch } from '@/services/setup.service'

const TYPES: { value: BatchType; label: string }[] = [
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'IG', label: 'IG' },
]

interface FormState { name: string; type: BatchType; campusId: string; stream: string; ig1Subgroup: string }
const EMPTY: FormState = { name: '', type: 'OFFLINE', campusId: '', stream: '', ig1Subgroup: '' }

export default function BatchesSetupPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const res = useAsyncResource(() => getBatches(accessToken!), [accessToken], { enabled: !!accessToken })
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<SetupBatch | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const batches = useMemo(() => res.data?.batches ?? [], [res.data])
  const campuses = res.data?.campuses ?? []
  const shown = useMemo(
    () => batches.filter((b) => !filter || b.campusId?._id === filter),
    [batches, filter],
  )
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  function openNew() {
    setForm({ ...EMPTY, campusId: filter || '' }); setError(''); setEditing('new')
  }
  function openEdit(b: SetupBatch) {
    setForm({ name: b.name, type: b.type, campusId: b.campusId?._id ?? '', stream: b.stream ?? '', ig1Subgroup: b.ig1Subgroup ?? '' })
    setError(''); setEditing(b)
  }

  async function save() {
    if (!accessToken || !editing) return
    setError('')
    if (form.name.trim().length < 2) { setError('Enter the batch name'); return }
    if (!form.campusId) { setError('Select a campus'); return }
    setSaving(true)
    try {
      if (editing === 'new') {
        await createBatch({
          name: form.name.trim(), type: form.type, campusId: form.campusId,
          stream: form.type === 'IG' ? form.stream || undefined : undefined,
          ig1Subgroup: form.type === 'IG' ? form.ig1Subgroup || undefined : undefined,
        }, accessToken)
        toast.success('Batch added', form.name.trim())
      } else {
        const patch: Parameters<typeof updateBatch>[1] = {}
        if (form.name.trim() !== editing.name) patch.name = form.name.trim()
        if (form.type !== editing.type) patch.type = form.type
        if (form.campusId !== editing.campusId?._id) patch.campusId = form.campusId
        if (form.type === 'IG' && form.stream && form.stream !== editing.stream) patch.stream = form.stream
        if (form.type === 'IG' && form.ig1Subgroup && form.ig1Subgroup !== editing.ig1Subgroup) patch.ig1Subgroup = form.ig1Subgroup
        if (Object.keys(patch).length === 0) { setEditing(null); setSaving(false); return }
        await updateBatch(editing._id, patch, accessToken)
        toast.success('Batch updated', 'Changes have been saved.')
      }
      setEditing(null)
      res.refetch()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function toggle(b: SetupBatch) {
    if (!accessToken) return
    const next = !b.isActive
    if (!next && !window.confirm(`Deactivate ${b.name}? It disappears from the Push Board batch list. Past entries stay.`)) return
    try {
      await updateBatch(b._id, { isActive: next }, accessToken)
      toast.success(next ? 'Batch activated' : 'Batch deactivated', b.name)
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
          <h1 style={{ marginBottom: '0.125rem' }}>Batches</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Batches teachers pick on the Push Board at campuses that run more than one.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>+ Add Batch</button>
      </div>

      {res.status === 'error' && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={res.error?.message ?? ''} what="Couldn't load batches" onRetry={res.refetch} />
        </div>
      )}

      <div className="card">
        <div style={{ maxWidth: 320, marginBottom: '1.25rem' }}>
          <select className="input" aria-label="Filter by campus" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All campuses</option>
            {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>

        {res.status === 'loading' ? (
          <SkeletonTable rows={6} cols={5} />
        ) : shown.length === 0 ? (
          <EmptyState title="No batches" description="Add a batch to a campus to make it available on the Push Board." action={{ label: '+ Add Batch', onClick: openNew }} />
        ) : (
          <div className="table-wrapper">
            <table style={{ minWidth: 560 }}>
              <thead>
                <tr><th>Batch</th><th>Campus</th><th>Type</th><th>Status</th><th style={{ width: 150, textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {shown.map((b) => (
                  <tr key={b._id} style={{ opacity: b.isActive ? 1 : 0.6 }}>
                    <td style={{ fontWeight: 600 }}>{b.name}</td>
                    <td>{b.campusId?.name ?? '—'}</td>
                    <td>{TYPES.find((t) => t.value === b.type)?.label ?? b.type}{b.type === 'IG' && b.stream ? ` · ${b.stream}` : ''}</td>
                    <td><span className={`badge ${b.isActive ? 'badge-green' : 'badge-gray'}`}>{b.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(b)}>{b.isActive ? 'Deactivate' : 'Activate'}</button>
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
          role="dialog" aria-modal="true" aria-label={isNew ? 'Add batch' : 'Edit batch'}
          className="modal-backdrop"
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null) }}
        >
          <div className="modal-panel modal-md">
            <div className="modal-header">
              <h2>{isNew ? 'Add Batch' : 'Edit Batch'}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="modal-close">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save() }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && <ErrorAlert message={error} />}
                <FormField label="Batch name" htmlFor="bt-name" required>
                  <input id="bt-name" className="input" autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. NEET Repeaters A" />
                </FormField>
                <FormField label="Campus" htmlFor="bt-campus" required>
                  <select id="bt-campus" className="input" value={form.campusId} onChange={(e) => set('campusId', e.target.value)}>
                    <option value="">— select campus —</option>
                    {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </FormField>
                <FormField label="Type" htmlFor="bt-type">
                  <select id="bt-type" className="input" value={form.type} onChange={(e) => set('type', e.target.value as BatchType)}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </FormField>
                {form.type === 'IG' && (
                  <div className="input-group">
                    <FormField label="Stream" htmlFor="bt-stream">
                      <select id="bt-stream" className="input" value={form.stream} onChange={(e) => set('stream', e.target.value)}>
                        <option value="">—</option><option value="NEET">NEET</option><option value="JEE">JEE</option>
                      </select>
                    </FormField>
                    <FormField label="Year" htmlFor="bt-sub">
                      <select id="bt-sub" className="input" value={form.ig1Subgroup} onChange={(e) => set('ig1Subgroup', e.target.value)}>
                        <option value="">—</option><option value="PLUS_ONE">Plus One</option><option value="PLUS_TWO">Plus Two</option>
                      </select>
                    </FormField>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving…</> : (isNew ? 'Add Batch' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
