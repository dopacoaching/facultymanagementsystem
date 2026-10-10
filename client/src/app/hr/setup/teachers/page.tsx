'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useToast } from '@/components/ui/Toast'
import { ErrorAlert, EmptyState, SkeletonCard } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { addTeacher, getCampuses, updateTeacher } from '@/services/setup.service'

export default function TeachersSetupPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const res = useAsyncResource(() => getCampuses(accessToken!), [accessToken], { enabled: !!accessToken })
  const campuses = useMemo(() => res.data ?? [], [res.data])

  const [campusId, setCampusId] = useState('')
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Default to the first campus once loaded; keep the pick across refreshes.
  useEffect(() => {
    if (!campusId && campuses.length) setCampusId(campuses[0]._id)
  }, [campuses, campusId])

  const campus = campuses.find((c) => c._id === campusId)

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true)
    try {
      await fn()
      toast.success(ok)
      res.refetch()
    } catch (e: unknown) {
      toast.error('Could not save', e instanceof Error ? e.message : undefined)
    } finally { setBusy(false) }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken || !campus || !newName.trim()) return
    await run(() => addTeacher(campus._id, newName.trim(), accessToken), 'Teacher added')
    setNewName('')
  }

  async function rename() {
    if (!accessToken || !campus || !renaming) return
    const { from, to } = renaming
    if (!to.trim() || to.trim() === from) { setRenaming(null); return }
    await run(() => updateTeacher(campus._id, from, { newName: to.trim() }, accessToken), 'Teacher renamed')
    setRenaming(null)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Teachers</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            The names teachers choose from in “Updated by” and “Marked by”. Past entries keep the name they were saved with.
          </p>
        </div>
      </div>

      {res.status === 'error' && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={res.error?.message ?? ''} what="Couldn't load campuses" onRetry={res.refetch} />
        </div>
      )}

      {res.status === 'loading' ? (
        <SkeletonCard lines={5} />
      ) : campuses.length === 0 ? (
        <div className="card"><EmptyState title="No campuses yet" description="Add a campus first, then manage its teachers here." /></div>
      ) : (
        <div className="card">
          <div style={{ maxWidth: 360, marginBottom: '1.25rem' }}>
            <FormField label="Campus" htmlFor="tc-campus">
              <select id="tc-campus" className="input" value={campusId} onChange={(e) => { setCampusId(e.target.value); setRenaming(null) }}>
                {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}{c.isActive ? '' : ' (inactive)'}</option>)}
              </select>
            </FormField>
          </div>

          <form onSubmit={add} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div style={{ flex: '1 1 240px', maxWidth: 360 }}>
              <FormField label="Add a teacher" htmlFor="tc-new">
                <input id="tc-new" className="input" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} placeholder="Teacher name" />
              </FormField>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy || !newName.trim()}>+ Add</button>
          </form>

          {campus && campus.teachers.length === 0 ? (
            <EmptyState title="No teachers yet" description="Add the names teachers at this campus choose from." />
          ) : (
            <div className="table-wrapper">
              <table style={{ minWidth: 420 }}>
                <thead>
                  <tr><th>Name</th><th>Status</th><th style={{ width: 200, textAlign: 'right' }}>Actions</th></tr>
                </thead>
                <tbody>
                  {campus?.teachers.map((t) => (
                    <tr key={t.name} style={{ opacity: t.isActive ? 1 : 0.6 }}>
                      <td style={{ fontWeight: 600 }}>
                        {renaming?.from === t.name ? (
                          <input
                            className="input" autoFocus value={renaming.to} maxLength={60}
                            onChange={(e) => setRenaming({ from: t.name, to: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setRenaming(null) }}
                          />
                        ) : t.name}
                      </td>
                      <td><span className={`badge ${t.isActive ? 'badge-green' : 'badge-gray'}`}>{t.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {renaming?.from === t.name ? (
                          <>
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={rename}>Save</button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRenaming(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRenaming({ from: t.name, to: t.name })}>Edit</button>
                            <button
                              type="button" className="btn btn-ghost btn-sm" disabled={busy}
                              onClick={() => run(() => updateTeacher(campusId, t.name, { isActive: !t.isActive }, accessToken!), t.isActive ? 'Teacher deactivated' : 'Teacher activated')}
                            >
                              {t.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
