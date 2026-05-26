'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches, getAll as getFaculty } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'

interface Slot {
  _id: string
  batchId: string | { _id: string; name: string }
  facultyId?: { _id: string; name: string } | string
  dayOfWeek: number
  subject: string
  startTime: string
  endTime: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TimetablePage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const [slots, setSlots]           = useState<Slot[]>([])
  const [batches, setBatches]       = useState<Batch[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm] = useState({
    batchId: '',
    dayOfWeek: 1,
    subject: '',
    startTime: '09:15',
    endTime: '10:15',
    facultyId: '',
  })
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState('')
  const [error, setError]           = useState('')

  const canDelete = role === 'ADMIN' || role === 'IS_ACADEMICS_MANAGER'

  const load = () => {
    if (accessToken)
      apiFetch<Slot[]>('/integrated-school/timetable', { token: accessToken })
        .then(setSlots)
        .catch(console.error)
  }

  useEffect(() => {
    if (!accessToken) return
    load()
    getBatches(accessToken).then((list) => {
      const isBatches = list.filter((b) => b.type === 'INTEGRATED_SCHOOL')
      setBatches(isBatches)
      if (isBatches.length) setForm((f) => ({ ...f, batchId: isBatches[0]._id }))
    }).catch(console.error)
    getFaculty(accessToken).then(setFacultyList).catch(console.error)
  }, [accessToken])

  async function handleSave() {
    if (!accessToken || !form.batchId || !form.subject) { setError('Batch and subject required'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/integrated-school/timetable', {
        token: accessToken,
        method: 'POST',
        body: { ...form, dayOfWeek: Number(form.dayOfWeek) },
      })
      setShowForm(false); load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return
    if (!confirm('Remove this timetable slot?')) return
    setDeleting(id)
    try {
      await apiFetch(`/integrated-school/timetable/${id}`, { method: 'DELETE', token: accessToken })
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    } finally { setDeleting('') }
  }

  const getBatchName = (bid: string | { _id: string; name: string } | null | undefined): string => {
    if (!bid) return '—'
    if (typeof bid === 'object') return bid.name
    return batches.find((b) => b._id === bid)?.name ?? String(bid).slice(-6)
  }

  const byDay = DAYS.map((day, idx) => ({
    day,
    slots: slots.filter((s) => s.dayOfWeek === idx),
  })).filter((d) => d.slots.length > 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>IS Timetable</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {slots.length} slot{slots.length !== 1 ? 's' : ''} across {byDay.length} day{byDay.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Slot</button>
      </div>

      {/* ── New Slot Modal ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 560, border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, margin: 0 }}>New Timetable Slot</h2>
              <button onClick={() => { setShowForm(false); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="label">IS Batch</label>
                  <select className="input" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
                    <option value="">— select —</option>
                    {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Day</label>
                  <select className="input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: +e.target.value })}>
                    {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Subject</label>
                  <input className="input" value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. Mathematics" />
                </div>
                <div className="form-group">
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">End Time</label>
                  <input type="time" className="input" value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Faculty (optional)</label>
                  <select className="input" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
                    <option value="">— unassigned —</option>
                    {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Save Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {byDay.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⏱</div>
            <h3>No timetable slots yet</h3>
            <p>Click &ldquo;Add Slot&rdquo; to build the IS schedule</p>
          </div>
        </div>
      )}

      {byDay.map(({ day, slots: daySlots }) => (
        <div key={day} className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-primary)', fontSize: '1rem' }}>{day}</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Subject</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Faculty</th>
                  {canDelete && <th style={{ width: 60 }}></th>}
                </tr>
              </thead>
              <tbody>
                {daySlots
                  .slice()
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((slot) => (
                    <tr key={slot._id}>
                      <td style={{ fontWeight: 600 }}>{getBatchName(slot.batchId)}</td>
                      <td>{slot.subject}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{slot.startTime}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{slot.endTime}</td>
                      <td>{typeof slot.facultyId === 'object' ? (slot.facultyId?.name ?? '—') : '—'}</td>
                      {canDelete && (
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(slot._id)}
                            disabled={deleting === slot._id}
                            title="Remove slot"
                          >
                            {deleting === slot._id ? '…' : '✕'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
