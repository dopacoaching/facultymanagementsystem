'use client'
import React, { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFacultyList } from '@/services/faculty.service'
import type { Faculty } from '@/types'
import {
  getAvailability,
  addAvailabilityDates,
  updateAvailabilityEntry,
  deleteAvailabilityEntry,
} from '@/services/availability.service'
import type { AvailabilityEntry, AvailabilityStatus } from '@/services/availability.service'
import { Skeleton, ErrorAlert, EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const STATUS_STYLE: Record<AvailabilityStatus, { badge: string; label: string }> = {
  AVAILABLE:   { badge: 'badge-green',  label: 'Available'   },
  RESCHEDULED: { badge: 'badge-yellow', label: 'Rescheduled' },
  CANCELLED:   { badge: 'badge-red',    label: 'Cancelled'   },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AvailabilityPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const now = new Date()

  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())

  const [faculty,         setFaculty]         = useState<Faculty[]>([])
  const [selectedFaculty, setSelectedFaculty] = useState<string>('')
  const [entries,         setEntries]         = useState<AvailabilityEntry[]>([])
  const [loadingEntries,  setLoadingEntries]  = useState(false)

  // Add dates
  const [pendingDate,  setPendingDate]  = useState('')
  const [stagingDates, setStagingDates] = useState<string[]>([])
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState('')

  // Edit entry
  const [editingId,     setEditingId]     = useState<string | null>(null)
  const [editStatus,    setEditStatus]    = useState<AvailabilityStatus>('AVAILABLE')
  const [editRemark,    setEditRemark]    = useState('')
  const [editSaving,    setEditSaving]    = useState(false)
  const [editError,     setEditError]     = useState('')

  // Load faculty list once
  useEffect(() => {
    if (!accessToken) return
    getFacultyList(accessToken)
      .then((list) => setFaculty(list.filter((f) => f.isActive)))
      .catch(console.error)
  }, [accessToken])

  // Load entries when faculty/month/year changes
  useEffect(() => {
    if (!accessToken || !selectedFaculty) { setEntries([]); return }
    setLoadingEntries(true)
    setEntries([]) // clear stale data from previous selection immediately
    getAvailability(selectedFaculty, month, year, accessToken)
      .then(setEntries)
      .catch((err) => { console.error(err); setEntries([]) })
      .finally(() => setLoadingEntries(false))
  }, [accessToken, selectedFaculty, month, year])

  function addToStaging() {
    if (!pendingDate) return
    // Prevent duplicates in staging or already-saved entries
    const alreadySaved = entries.some((e) => e.date.startsWith(pendingDate))
    const alreadyStaged = stagingDates.includes(pendingDate)
    if (alreadySaved || alreadyStaged) return
    setStagingDates((prev) => [...prev, pendingDate].sort())
    setPendingDate('')
  }

  async function saveAvailability() {
    if (!accessToken || !selectedFaculty || stagingDates.length === 0) return
    setSaving(true); setSaveError('')
    try {
      const updated = await addAvailabilityDates(selectedFaculty, stagingDates, accessToken)
      setEntries(updated)
      setStagingDates([])
      toast.success('Availability saved', `${stagingDates.length} date${stagingDates.length !== 1 ? 's' : ''} added successfully.`)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  function startEdit(entry: AvailabilityEntry) {
    setEditingId(entry._id)
    setEditStatus(entry.status)
    setEditRemark(entry.remark ?? '')
    setEditError('')
  }

  async function saveEdit() {
    if (!accessToken || !editingId) return
    if (editStatus !== 'AVAILABLE' && !editRemark.trim()) {
      setEditError('A remark is required for Rescheduled or Cancelled status')
      return
    }
    setEditSaving(true); setEditError('')
    try {
      const updated = await updateAvailabilityEntry(editingId, editStatus, editRemark, accessToken)
      setEntries((prev) => prev.map((e) => e._id === editingId ? updated : e))
      setEditingId(null)
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Failed to update')
    } finally { setEditSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return
    try {
      await deleteAvailabilityEntry(id, accessToken)
      setEntries((prev) => prev.filter((e) => e._id !== id))
      if (editingId === id) setEditingId(null)
    } catch (e: unknown) {
      console.error(e)
    }
  }

  const selectedFacultyObj = faculty.find((f) => f._id === selectedFaculty)

  // Month date range for the date picker
  const minDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const maxDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return (
    <div>
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 200, flex: '1 1 200px' }}>
            <label className="label">Faculty</label>
            <select
              className="input"
              value={selectedFaculty}
              onChange={(e) => { setSelectedFaculty(e.target.value); setStagingDates([]) }}
            >
              <option value="">— Select faculty —</option>
              {faculty.map((f) => (
                <option key={f._id} value={f._id}>{f.name} ({f.subject})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Month</label>
            <select className="input" value={month} onChange={(e) => { setMonth(+e.target.value); setStagingDates([]) }} style={{ minWidth: 100 }}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Year</label>
            <input type="number" className="input" value={year} onChange={(e) => { setYear(+e.target.value); setStagingDates([]) }} style={{ width: 90 }} />
          </div>
        </div>
      </div>

      {!selectedFaculty && (
        <div className="card">
          <EmptyState
            icon="📅"
            title="Select a faculty member"
            description="Choose a faculty member from the dropdown above to view and manage their monthly availability."
          />
        </div>
      )}

      {selectedFaculty && (
        <>
          {/* ── Add Dates ─────────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h2>
                Add Available Dates
                {selectedFacultyObj && (
                  <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', fontSize: '0.9375rem', marginLeft: '0.5rem' }}>
                    — {selectedFacultyObj.name}
                  </span>
                )}
              </h2>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{MONTHS[month - 1]} {year}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={pendingDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setPendingDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addToStaging() }}
                />
              </div>
              <button
                className="btn btn-ghost"
                onClick={addToStaging}
                disabled={!pendingDate}
                style={{ alignSelf: 'flex-end' }}
              >
                + Add to list
              </button>
            </div>

            {stagingDates.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                  Pending ({stagingDates.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.875rem' }}>
                  {stagingDates.map((d) => (
                    <span key={d} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)',
                      background: 'var(--color-primary-dim, rgba(79,70,229,.1))',
                      color: 'var(--color-primary)', fontSize: '0.8125rem', fontWeight: 500,
                      border: '1px solid rgba(79,70,229,.2)',
                    }}>
                      {fmtDate(d + 'T00:00:00')}
                      <button
                        onClick={() => setStagingDates((prev) => prev.filter((x) => x !== d))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', opacity: 0.6, fontSize: '0.9rem', lineHeight: 1 }}
                      >×</button>
                    </span>
                  ))}
                </div>
                {saveError && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <ErrorAlert message={saveError} />
                  </div>
                )}
                <button className="btn btn-primary" onClick={saveAvailability} disabled={saving}>
                  {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : `Save ${stagingDates.length} date${stagingDates.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>

          {/* ── Entries table ─────────────────────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <h2>Availability — {MONTHS[month - 1]} {year}</h2>
              {entries.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['AVAILABLE', 'RESCHEDULED', 'CANCELLED'] as AvailabilityStatus[]).map((s) => {
                    const count = entries.filter((e) => e.status === s).length
                    if (!count) return null
                    return (
                      <span key={s} className={`badge ${STATUS_STYLE[s].badge}`} style={{ fontSize: '0.7rem' }}>
                        {count} {STATUS_STYLE[s].label.toLowerCase()}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {loadingEntries ? (
              <div style={{ padding: '0.5rem' }}>
                {[1,2,3].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.8rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <Skeleton height="0.875rem" width="35%" />
                    <Skeleton height="1.25rem" width={80} />
                    <Skeleton height="0.875rem" width="25%" />
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No availability entered yet"
                description="Add dates using the form above to track this faculty member's availability."
              />
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Remark</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <React.Fragment key={entry._id}>
                        <tr>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(entry.date)}</td>
                          <td>
                            <span className={`badge ${STATUS_STYLE[entry.status].badge}`}>
                              {STATUS_STYLE[entry.status].label}
                            </span>
                          </td>
                          <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', maxWidth: 240 }}>
                            {entry.remark ? (
                              <span style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.5rem',
                                background: 'var(--color-surface-2)',
                                borderRadius: 'var(--radius-sm)',
                                fontStyle: 'italic',
                              }}>
                                "{entry.remark}"
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => startEdit(entry)}
                              style={{ marginRight: '0.375rem', fontSize: '0.75rem' }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDelete(entry._id)}
                              style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>

                        {/* Inline edit row */}
                        {editingId === entry._id && (
                          <tr key={`${entry._id}-edit`} style={{ background: 'var(--color-surface-2)' }}>
                            <td colSpan={4} style={{ padding: '0.875rem 1rem' }}>
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
                                  <label className="label" style={{ fontSize: '0.75rem' }}>Status</label>
                                  <select
                                    className="input"
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value as AvailabilityStatus)}
                                    style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                                  >
                                    <option value="AVAILABLE">Available</option>
                                    <option value="RESCHEDULED">Rescheduled</option>
                                    <option value="CANCELLED">Cancelled</option>
                                  </select>
                                </div>
                                <div className="form-group" style={{ margin: 0, flex: '1 1 220px' }}>
                                  <label className="label" style={{ fontSize: '0.75rem' }}>
                                    Remark {editStatus !== 'AVAILABLE' && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                                  </label>
                                  <input
                                    type="text"
                                    className="input"
                                    value={editRemark}
                                    onChange={(e) => setEditRemark(e.target.value)}
                                    placeholder={editStatus === 'RESCHEDULED' ? 'e.g. Moved to 18th June' : editStatus === 'CANCELLED' ? 'e.g. Emergency leave' : 'Optional note'}
                                    style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                                  />
                                </div>
                                {editError && (
                                  <div style={{ width: '100%', color: 'var(--color-danger)', fontSize: '0.8125rem' }}>{editError}</div>
                                )}
                                <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                                  <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={editSaving} style={{ fontSize: '0.8125rem' }}>
                                    {editSaving ? 'Saving…' : 'Save'}
                                  </button>
                                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)} style={{ fontSize: '0.8125rem' }}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
