'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { listNoClass, removeNoClass, updateNoClass, type NoClassDoc } from '@/services/entries.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { Icon } from '@/components/ui/Icon'
import rs from '@/components/hr/reports/Reports.module.css'
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
      <div className="page-head">
        <div>
          <h1>No Class Days</h1>
          <p className="page-subtitle">Days campuses marked as having no class. Edit the reason or remove a marker.</p>
        </div>
      </div>

      {error && <div style={{ marginBottom: 'var(--space-4)' }}><ErrorAlert message={error} onRetry={load} /></div>}

      {!loading && rows.length > 0 && (
        <div className={`stats-grid ${rs.kpis}`} aria-live="polite">
          <div className="stat-card">
            <div className="stat-label">No Class markers</div>
            <div className="stat-value">{shown.length}</div>
            <div className="stat-sub">{campus || 'all campuses'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Campuses</div>
            <div className="stat-value">{new Set(shown.map((r) => r.campusName)).size}</div>
            <div className="stat-sub">with a marker in range</div>
          </div>
        </div>
      )}

      <div className={rs.filters}>
        <div className={rs.filterRow}>
          {campuses.length > 1 && (
            <div className={`form-group ${rs.fieldWide}`}>
              <label className="label" htmlFor="nc-campus">Campus</label>
              <select id="nc-campus" className="input" value={campus} onChange={(e) => setCampus(e.target.value)}>
                <option value="">All campuses</option>
                {campuses.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
        </div>
      </div>

      {loading ? (
        <div className="card card-flush"><SkeletonTable rows={5} cols={5} /></div>
      ) : shown.length === 0 ? (
        <div className="card"><EmptyState title="No No Class days" description="No campus marked a day as No Class in this range." /></div>
      ) : (
        <div className="table-wrapper table-stack">
          <table>
            <thead>
              <tr><th>Date</th><th>Campus</th><th>Batches</th><th>Reason</th><th>Marked by</th><th><span className={rs.srOnly}>Actions</span></th></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r._id}>
                  <td data-label="Date" className={`num ${rs.nowrap} ${rs.muted}`}>{fmtDay(dayOf(r))}</td>
                  <td data-label="Campus" className={rs.strong}>
                    <span className="badge badge-gray"><Icon name="ban" size={12} /> No Class</span>{' '}{r.campusName}
                  </td>
                  <td data-label="Batches" className={rs.muted}>{r.batchNames?.length ? r.batchNames.join(', ') : 'Whole campus'}</td>
                  <td data-label="Reason">{r.reason || '—'}</td>
                  <td data-label="Marked by" className={rs.muted}>{r.markedByName || '—'}</td>
                  <td>
                    <div className={rs.rowActions}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>
                        <Icon name="edit" size={14} /> Edit
                      </button>
                      <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => remove(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div
          role="dialog" aria-modal="true" aria-label="Edit No Class reason"
          className="modal-backdrop"
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null) }}
        >
          <div className="modal-panel modal-md">
            <div className="modal-header">
              <h2>Edit reason</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="modal-close"><Icon name="x" size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save() }}>
              <div className="modal-body form-stack">
                {editError && <ErrorAlert message={editError} />}
                <p className="help-text" style={{ margin: 0 }}>
                  {editing.campusName} · <span className="mono">{fmtDay(dayOf(editing))}</span>
                </p>
                <div className="form-group">
                  <label className="label" htmlFor="nc-reason">Reason</label>
                  <input id="nc-reason" className="input" autoFocus value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner spinner-on-solid" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
