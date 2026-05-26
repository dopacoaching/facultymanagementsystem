'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, create, update } from '@/services/faculty.service'
import type { Faculty } from '@/types'

const SALARY_MODELS = ['HOURLY', 'FIXED_MONTHLY', 'FIXED_WITH_QUOTA', 'SPLIT_FIXED_VARIABLE', 'CONFIGURABLE']
const TYPES = ['PERMANENT', 'TEMPORARY', 'REGULAR', 'VISITING', 'CONTRACTUAL']

const EMPTY: Omit<Faculty, '_id'> = {
  name: '', subject: '', type: 'PERMANENT', salaryModel: 'HOURLY', isActive: true,
}

export default function FacultyPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [list, setList] = useState<Faculty[]>([])
  const [editing, setEditing] = useState<(Faculty | typeof EMPTY) | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = () => {
    // HR needs to see ALL faculty (including inactive) so they can manage/reactivate
    if (accessToken) getAll(accessToken, true).then(setList).catch(console.error)
  }

  useEffect(load, [accessToken])

  const filtered = list.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.subject.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    if (!accessToken || !editing) return
    setSaving(true); setError('')
    try {
      if ('_id' in editing) {
        await update(editing._id, editing, accessToken)
      } else {
        await create(editing as Omit<Faculty, '_id'>, accessToken)
      }
      setEditing(null); load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Faculty</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {list.length} faculty member{list.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing(EMPTY)}>
          + Add Faculty
        </button>
      </div>

      <div className="card">
        {/* Search bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', maxWidth: 360 }}>
            <span style={{
              position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--color-muted)', fontSize: '1rem', pointerEvents: 'none',
            }}>🔍</span>
            <input
              className="input"
              placeholder="Search by name or subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>{search ? 'No results found' : 'No faculty added yet'}</h3>
            <p>{search ? `No faculty match "${search}"` : 'Add your first faculty member to get started'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Salary Model</th>
                  <th>Status</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {f.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{f.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{f.subject}</td>
                    <td>
                      <span className="badge badge-gray">{f.type}</span>
                    </td>
                    <td>
                      <span className="badge badge-indigo">{f.salaryModel.replace(/_/g, ' ')}</span>
                    </td>
                    <td>
                      <span className={`badge ${f.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {f.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditing(f)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: 540,
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h2 style={{ fontWeight: 700, margin: 0 }}>
                {'_id' in editing ? 'Edit Faculty' : 'Add Faculty'}
              </h2>
              <button
                onClick={() => { setEditing(null); setError('') }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '1.25rem', color: 'var(--color-muted)',
                  padding: '0.25rem', borderRadius: '0.375rem',
                  lineHeight: 1,
                }}
              >×</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                  <span className="alert-icon">⚠</span>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[['name', 'Full Name'], ['subject', 'Subject']].map(([key, label]) => (
                  <div key={key} className="form-group">
                    <label className="label">{label}</label>
                    <input
                      className="input"
                      value={(editing as unknown as Record<string, string>)[key] ?? ''}
                      onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  </div>
                ))}

                <div className="form-group">
                  <label className="label">Employment Type</label>
                  <select className="input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Salary Model</label>
                  <select className="input" value={editing.salaryModel} onChange={(e) => setEditing({ ...editing, salaryModel: e.target.value })}>
                    {SALARY_MODELS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>

                {editing.salaryModel === 'HOURLY' && (
                  <div className="form-group">
                    <label className="label">Hourly Rate (₹)</label>
                    <input
                      type="number"
                      className="input"
                      value={editing.hourlyRate ?? ''}
                      onChange={(e) => setEditing({ ...editing, hourlyRate: +e.target.value })}
                      placeholder="0"
                    />
                  </div>
                )}

                {['FIXED_MONTHLY', 'FIXED_WITH_QUOTA', 'SPLIT_FIXED_VARIABLE'].includes(editing.salaryModel) && (
                  <div className="form-group">
                    <label className="label">Fixed Monthly Salary (₹)</label>
                    <input
                      type="number"
                      className="input"
                      value={editing.fixedMonthlySalary ?? ''}
                      onChange={(e) => setEditing({ ...editing, fixedMonthlySalary: +e.target.value })}
                      placeholder="0"
                    />
                  </div>
                )}

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                  }}>
                    <input
                      type="checkbox"
                      checked={editing.isActive}
                      onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                    />
                    Active (uncheck to deactivate)
                  </label>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
            }}>
              <button className="btn btn-ghost" onClick={() => { setEditing(null); setError('') }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff', width: '0.8rem', height: '0.8rem' }} /> Saving…</>
                ) : ('_id' in editing ? 'Save Changes' : 'Add Faculty')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
