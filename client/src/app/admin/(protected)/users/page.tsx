'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getUsers, createUser, updateUser } from '@/services/user.service'
import { getBatches } from '@/services/faculty.service'
import { getAll as getFaculty } from '@/services/faculty.service'
import type { AppUser, CreateUserPayload } from '@/services/user.service'
import type { UserRole } from '@/types'
import type { Batch } from '@/services/faculty.service'
import type { Faculty } from '@/types'
import PasswordInput from '@/components/ui/PasswordInput'

/** Client-side mirror of the server's validatePasswordComplexity rule. */
function validatePasswordComplexity(pw: string): string | null {
  if (!pw || pw.length < 8)  return 'Password must be at least 8 characters'
  if (pw.length > 64)         return 'Password must be at most 64 characters'
  if (!/[A-Z]/.test(pw))     return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(pw))     return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(pw))     return 'Password must contain at least one digit'
  if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(pw))
    return 'Password must contain at least one special character (!@#$%^&* etc.)'
  return null
}

const ALL_ROLES: UserRole[] = [
  'ADMIN', 'HR_MANAGER', 'ACADEMICS_MANAGER', 'IS_ACADEMICS_MANAGER',
  'COORDINATOR', 'IS_COORDINATOR', 'FACULTY',
]

const ROLE_BADGE: Record<string, string> = {
  ADMIN:                'badge-red',
  HR_MANAGER:           'badge-yellow',
  ACADEMICS_MANAGER:    'badge-blue',
  IS_ACADEMICS_MANAGER: 'badge-blue',
  COORDINATOR:          'badge-green',
  IS_COORDINATOR:       'badge-green',
  FACULTY:              'badge-gray',
}

const ROLE_DISPLAY: Record<string, string> = {
  ADMIN:                'Admin',
  HR_MANAGER:           'HR Manager',
  ACADEMICS_MANAGER:    'Academics Manager',
  IS_ACADEMICS_MANAGER: 'IS Academics Manager',
  COORDINATOR:          'Class Teacher',
  IS_COORDINATOR:       'IS Class Teacher',
  FACULTY:              'Faculty',
}
function getRoleLabel(role: string) {
  return ROLE_DISPLAY[role] ?? role.replace(/_/g, ' ')
}

export default function AdminUsersPage() {
  const { accessToken, userId: selfId } = useAppSelector((s) => s.auth)
  const [users, setUsers]             = useState<AppUser[]>([])
  const [batches, setBatches]         = useState<Batch[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    username: '', password: '', role: 'COORDINATOR', facultyId: '', batchId: '',
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit modal
  const [editTarget, setEditTarget]   = useState<AppUser | null>(null)
  const [editRole, setEditRole]       = useState<UserRole>('COORDINATOR')
  const [editBatchId, setEditBatchId] = useState('')
  const [editPw, setEditPw]           = useState('')
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState('')
  const [toggling, setToggling]       = useState('')

  const load = async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const data = await getUsers(accessToken)
      setUsers(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!accessToken) return
    load()
    getBatches(accessToken).then(setBatches).catch(console.error)
    getFaculty(accessToken, true).then(setFacultyList).catch(console.error)
  }, [accessToken])

  async function handleCreate() {
    if (!accessToken) return
    if (!createForm.username || !createForm.password || !createForm.role) {
      setCreateError('Username, password and role are required'); return
    }
    const pwErr = validatePasswordComplexity(createForm.password)
    if (pwErr) { setCreateError(pwErr); return }
    setCreating(true); setCreateError('')
    try {
      const payload = { ...createForm }
      if (!payload.facultyId) delete payload.facultyId
      if (!payload.batchId) delete payload.batchId
      await createUser(payload, accessToken)
      setShowCreate(false)
      setCreateForm({ username: '', password: '', role: 'COORDINATOR', facultyId: '', batchId: '' })
      load()
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Create failed')
    } finally { setCreating(false) }
  }

  function openEdit(u: AppUser) {
    setEditTarget(u)
    setEditRole(u.role)
    setEditBatchId(typeof u.batchId === 'object' ? (u.batchId?._id ?? '') : (u.batchId ?? ''))
    setEditPw('')
    setEditError('')
  }

  async function handleToggleActive(u: AppUser) {
    if (!accessToken || toggling) return
    if (u._id === selfId) { setError('You cannot deactivate your own account.'); return }
    setToggling(u._id); setError('')
    try {
      await updateUser(u._id, { isActive: !u.isActive }, accessToken)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally { setToggling('') }
  }

  async function handleEditSave() {
    if (!accessToken || !editTarget) return
    setEditSaving(true); setEditError('')
    try {
      const payload: { role: UserRole; batchId?: string | null; password?: string } = {
        role: editRole,
        batchId: editBatchId || null,
      }
      if (editPw) {
        const pwErr = validatePasswordComplexity(editPw)
        if (pwErr) { setEditError(pwErr); setEditSaving(false); return }
        payload.password = editPw
      }
      await updateUser(editTarget._id, payload, accessToken)
      setEditTarget(null)
      load()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Update failed')
    } finally { setEditSaving(false) }
  }

  const activeCount   = users.filter((u) => u.isActive).length
  const inactiveCount = users.length - activeCount

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>User Management</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New User</button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <span className="alert-icon">⚠</span>{error}
        </div>
      )}

      {/* ── Create User Modal ──────────────────────────────────────────────────── */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 520, border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, margin: 0 }}>Create User</h2>
              <button onClick={() => { setShowCreate(false); setCreateError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {createError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{createError}</div>}
              <div className="input-group">
                <div className="form-group">
                  <label className="label">Username</label>
                  <input className="input" value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    autoComplete="off" placeholder="e.g. john_doe" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">Password</label>
                  <PasswordInput
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    autoComplete="new-password"
                    placeholder="Min 8 chars · upper · lower · digit · symbol"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Role</label>
                  <select className="input" value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}>
                    {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Batch (optional)</label>
                  <select className="input" value={createForm.batchId}
                    onChange={(e) => setCreateForm({ ...createForm, batchId: e.target.value })}>
                    <option value="">— none —</option>
                    {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                {createForm.role === 'FACULTY' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="label">Link Faculty Profile (optional)</label>
                    <select className="input" value={createForm.facultyId}
                      onChange={(e) => setCreateForm({ ...createForm, facultyId: e.target.value })}>
                      <option value="">— none —</option>
                      {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name} ({f.subject})</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => { setShowCreate(false); setCreateError('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Creating…</> : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ────────────────────────────────────────────────────── */}
      {editTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 480, border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontWeight: 700, margin: 0 }}>Edit User</h2>
                <p style={{ margin: '0.125rem 0 0', fontSize: '0.875rem', color: 'var(--color-muted)' }}>@{editTarget.username}</p>
              </div>
              <button onClick={() => setEditTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {editError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{editError}</div>}
              <div className="input-group">
                <div className="form-group">
                  <label className="label">Role</label>
                  <select className="input" value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}>
                    {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Batch (optional)</label>
                  <select className="input" value={editBatchId}
                    onChange={(e) => setEditBatchId(e.target.value)}>
                    <option value="">— none —</option>
                    {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">Reset Password <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(leave blank to keep current)</span></label>
                  <PasswordInput
                    value={editPw}
                    onChange={(e) => setEditPw(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Min 8 chars · upper · lower · digit · symbol"
                    showStrength={editPw.length > 0}
                  />
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Users Table ────────────────────────────────────────────────────────── */}
      <div className="card">
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-muted)', padding: '1rem 0' }}>
            <span className="spinner" /> Loading…
          </div>
        )}
        {!loading && users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔐</div>
            <h3>No users yet</h3>
            <p>Create the first user account to get started</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Faculty / Batch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      @{u.username}
                      {u._id === selfId && (
                        <span className="badge badge-blue" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>you</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-gray'}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {u.facultyId && typeof u.facultyId === 'object'
                        ? <span title="Linked faculty">👤 {u.facultyId.name}</span>
                        : null}
                      {u.batchId && typeof u.batchId === 'object'
                        ? <span title="Assigned batch" style={{ marginLeft: u.facultyId ? '0.5rem' : 0 }}>🗂 {u.batchId.name}</span>
                        : null}
                      {!u.facultyId && !u.batchId ? '—' : null}
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'nowrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} title="Edit user">✎</button>
                        {u._id !== selfId && (
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => handleToggleActive(u)}
                            disabled={toggling === u._id}
                            title={u.isActive ? 'Deactivate' : 'Reactivate'}
                          >
                            {toggling === u._id ? '…' : u.isActive ? '⏸' : '▶'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
