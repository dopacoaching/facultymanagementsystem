'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { listNoClass, removeNoClass, updateNoClass, type NoClassDoc } from '@/services/entries.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { useToast } from '@/components/ui/Toast'
import { toLocalISO } from '@/utils/date'
import { fmtDay } from '@/components/hr/reports/reportShared'

/** The calendar day of a marker (server-formatted; falls back to the browser's reading). */
const dayOf = (r: NoClassDoc) => r.day ?? toLocalISO(new Date(r.date))

/** HR/Admin view of every "No Class" marker campuses have recorded. Teachers cannot undo
 *  a marker, so HR edits the reason or removes it here. */
export default function NoClassReportPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(toLocalISO(now))
  const [rows, setRows] = useState<NoClassDoc[]>([])
  const [campus, setCampus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<NoClassDoc | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  /** Latest request wins — a slow earlier response must not overwrite newer data. */
  const requestId = useRef(0)

  async function load() {
    if (!accessToken) return
    if (from > to) { setError('The start date must not be after the end date.'); return }
    const id = ++requestId.current
    setLoading(true); setError('')
    try {
      const data = await listNoClass(from, to, accessToken)
      if (id !== requestId.current) return
      setRows(data)
      setCampus((c) => (c && !data.some((r) => r.campusName === c) ? '' : c))
    } catch (e: unknown) {
      if (id !== requestId.current) return
      setError(e instanceof Error ? e.message : 'Failed to load No Class days')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }
  useEffect(() => { load() }, [accessToken, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const campuses = useMemo(() => Array.from(new Set(rows.map((r) => r.campusName))).sort(), [rows])
  const shown = rows.filter((r) => !campus || r.campusName === campus)

  function openEdit(r: NoClassDoc) { setEditing(r); setReason(r.reason ?? ''); setEditError('') }

  async function save() {
    if (!accessToken || !editing) return
    if (!reason.trim()) { setEditError('Enter the reason'); return }
    setSaving(true); setEditError('')
    try {
      await updateNoClass(editing._id, reason.trim(), accessToken)
      toast.success('Reason updated', 'The change has been saved.')
      setEditing(null)
      await load()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Could not save')
    } finally { setSaving(false) }
  }

  async function remove(r: NoClassDoc) {
    if (!accessToken) return
    if (!window.confirm(`Remove the No Class marker for ${r.campusName} on ${fmtDay(dayOf(r))}? The day will show as "report not submitted" again.`)) return
    try {
      await removeNoClass(r._id, accessToken)
      toast.success('No Class removed', r.campusName)
      await load()
    } catch (e: unknown) {
      toast.error('Could not remove', e instanceof Error ? e.message : undefined)
      await load()   // it may already be gone: show the current list
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>No Class Days</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Days campuses marked as having no class. Edit the reason or remove a marker.
          </p>
        </div>
      </div>

      {error && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} onRetry={load} /></div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
        {campuses.length > 1 && (
          <div style={{ maxWidth: 280, marginTop: '1rem' }}>
            <select className="input" aria-label="Filter by campus" value={campus} onChange={(e) => setCampus(e.target.value)}>
              <option value="">All campuses</option>
              {campuses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : shown.length === 0 ? (
          <EmptyState title="No No Class days" description="No campus marked a day as No Class in this range." />
        ) : (
          <div className="table-wrapper">
            <table style={{ minWidth: 640 }}>
              <thead>
                <tr><th>Date</th><th>Campus</th><th>Batches</th><th>Reason</th><th>Marked by</th><th style={{ width: 150, textAlign: 'right' }}></th></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r._id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{fmtDay(dayOf(r))}</td>
                    <td style={{ fontWeight: 600 }}>{r.campusName}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{r.batchNames?.length ? r.batchNames.join(', ') : 'Whole campus'}</td>
                    <td>{r.reason || '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{r.markedByName || '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Edit</button>{' '}
                      <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => remove(r)}>Delete</button>
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
          role="dialog" aria-modal="true" aria-label="Edit No Class reason"
          className="modal-backdrop"
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null) }}
        >
          <div className="modal-panel modal-md">
            <div className="modal-header">
              <h2>Edit reason</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="modal-close">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save() }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {editError && <ErrorAlert message={editError} />}
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted)' }}>
                  {editing.campusName} · {fmtDay(dayOf(editing))}
                </p>
                <input className="input" autoFocus aria-label="Reason" value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
