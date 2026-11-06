'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useToast } from '@/components/ui/Toast'
import { ErrorAlert, EmptyState, SkeletonCard } from '@/components/ui/Skeleton'
import { Icon } from '@/components/ui/Icon'
import rs from '@/components/hr/reports/Reports.module.css'
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

  const activeCount = campus?.teachers.filter((t) => t.isActive).length ?? 0

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Teachers</h1>
          <p className="page-subtitle">The names teachers choose from in “Updated by” and “Marked by”. Past entries keep the name they were saved with.</p>
        </div>
      </div>

      {res.status === 'error' && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ErrorAlert message={res.error?.message ?? ''} what="Couldn't load campuses" onRetry={res.refetch} />
        </div>
      )}

      {res.status === 'loading' ? (
        <SkeletonCard lines={5} />
      ) : campuses.length === 0 ? (
        <div className="card"><EmptyState title="No campuses yet" description="Add a campus first, then manage its teachers here." /></div>
      ) : (
        <>
          <div className={rs.filters}>
            <div className={rs.filterRow}>
              <div className={`form-group ${rs.fieldWide}`}>
                <label className="label" htmlFor="tc-campus">Campus</label>
                <select id="tc-campus" className="input" value={campusId} onChange={(e) => { setCampusId(e.target.value); setRenaming(null) }}>
                  {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}{c.isActive ? '' : ' (inactive)'}</option>)}
                </select>
              </div>
              <form onSubmit={add} className={rs.addRow} style={{ flex: '1 1 20rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label" htmlFor="tc-new">Add a teacher</label>
                  <input id="tc-new" className="input" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} placeholder="Teacher name" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy || !newName.trim()}>
                  <Icon name="plus" size={16} /> Add
                </button>
              </form>
            </div>
          </div>

          {campus && campus.teachers.length === 0 ? (
            <div className="card"><EmptyState title="No teachers yet" description="Add the names teachers at this campus choose from." /></div>
          ) : (
            <section className="card card-flush" aria-label={`Teachers at ${campus?.name ?? ''}`}>
              <div className="card-header">
                <h2 className={rs.setupTitle}><Icon name="users" size={18} /> {campus?.name}</h2>
                <span className="badge badge-gray"><span className="mono">{activeCount}</span> active of <span className="mono">{campus?.teachers.length ?? 0}</span></span>
              </div>
              <div className="table-wrapper table-stack" style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}>
                <table>
                  <thead>
                    <tr><th>Name</th><th>Status</th><th style={{ textAlign: 'right' }}><span className={rs.srOnly}>Actions</span></th></tr>
                  </thead>
                  <tbody>
                    {campus?.teachers.map((t) => (
                      <tr key={t.name} className={t.isActive ? undefined : rs.dim}>
                        <td data-label="Name" className={rs.strong}>
                          {renaming?.from === t.name ? (
                            <input
                              className={`input ${rs.renameInput}`} autoFocus value={renaming.to} maxLength={60}
                              aria-label={`New name for ${t.name}`}
                              onChange={(e) => setRenaming({ from: t.name, to: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setRenaming(null) }}
                            />
                          ) : t.name}
                        </td>
                        <td data-label="Status"><span className={`badge badge-dot ${t.isActive ? 'badge-green' : 'badge-gray'}`}>{t.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <div className={rs.rowActions}>
                            {renaming?.from === t.name ? (
                              <>
                                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={rename}>Save</button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRenaming(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRenaming({ from: t.name, to: t.name })}>
                                  <Icon name="edit" size={14} /> Edit
                                </button>
                                <button
                                  type="button" className={`btn btn-sm ${t.isActive ? 'btn-danger-ghost' : 'btn-outline'}`} disabled={busy}
                                  onClick={() => run(() => updateTeacher(campusId, t.name, { isActive: !t.isActive }, accessToken!), t.isActive ? 'Teacher deactivated' : 'Teacher activated')}
                                >
                                  {t.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
