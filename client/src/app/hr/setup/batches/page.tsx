'use client'
import { useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useToast } from '@/components/ui/Toast'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { Icon } from '@/components/ui/Icon'
import rs from '@/components/hr/reports/Reports.module.css'
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

  /** Batches grouped under their campus, so a campus with several reads as one block. */
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: SetupBatch[] }>()
    for (const b of shown) {
      const key = b.campusId?._id ?? ''
      const g = map.get(key)
      if (g) g.items.push(b); else map.set(key, { name: b.campusId?.name ?? 'No campus', items: [b] })
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [shown])

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Batches</h1>
          <p className="page-subtitle">Batches teachers pick on the Push Board at campuses that run more than one.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Icon name="plus" size={16} /> Add Batch
          </button>
        </div>
      </div>

      {res.status === 'error' && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ErrorAlert message={res.error?.message ?? ''} what="Couldn't load batches" onRetry={res.refetch} />
        </div>
      )}

      <div className={rs.filters}>
        <div className={rs.filterRow}>
          <div className={`form-group ${rs.fieldWide}`}>
            <label className="label" htmlFor="bt-filter">Campus</label>
            <select id="bt-filter" className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All campuses</option>
              {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          {res.status !== 'loading' && (
            <span className="badge badge-gray" aria-live="polite">
              <span className="mono">{shown.length}</span> {shown.length === 1 ? 'batch' : 'batches'}
            </span>
          )}
        </div>
      </div>

      {res.status === 'loading' ? (
        <div className="card card-flush"><SkeletonTable rows={6} cols={5} /></div>
      ) : shown.length === 0 ? (
        <div className="card">
          <EmptyState title="No batches" description="Add a batch to a campus to make it available on the Push Board." action={{ label: '+ Add Batch', onClick: openNew }} />
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.name} className={`card card-flush ${rs.setupGroup}`} aria-label={g.name}>
            <div className="card-header">
              <h2 className={rs.setupTitle}><Icon name="building" size={18} /> {g.name}</h2>
              <span className="badge badge-gray"><span className="mono">{g.items.length}</span> {g.items.length === 1 ? 'batch' : 'batches'}</span>
            </div>
            <div className="table-wrapper table-stack" style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}>
              <table>
                <thead>
                  <tr><th>Batch</th><th>Type</th><th>Status</th><th style={{ textAlign: 'right' }}><span className={rs.srOnly}>Actions</span></th></tr>
                </thead>
                <tbody>
                  {g.items.map((b) => (
                    <tr key={b._id} className={b.isActive ? undefined : rs.dim}>
                      <td data-label="Batch" className={rs.strong}>{b.name}</td>
                      <td data-label="Type">{TYPES.find((t) => t.value === b.type)?.label ?? b.type}{b.type === 'IG' && b.stream ? ` · ${b.stream}` : ''}</td>
                      <td data-label="Status"><span className={`badge badge-dot ${b.isActive ? 'badge-green' : 'badge-gray'}`}>{b.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div className={rs.rowActions}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>
                            <Icon name="edit" size={14} /> Edit
                          </button>
                          <button type="button" className={`btn btn-sm ${b.isActive ? 'btn-danger-ghost' : 'btn-outline'}`} onClick={() => toggle(b)}>{b.isActive ? 'Deactivate' : 'Activate'}</button>
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
          role="dialog" aria-modal="true" aria-label={isNew ? 'Add batch' : 'Edit batch'}
          className="modal-backdrop"
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null) }}
        >
          <div className="modal-panel modal-md">
            <div className="modal-header">
              <h2>{isNew ? 'Add Batch' : 'Edit Batch'}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="modal-close"><Icon name="x" size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save() }}>
              <div className="modal-body form-stack">
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
                  {saving ? <><span className="spinner spinner-on-solid" /> Saving…</> : (isNew ? 'Add Batch' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
