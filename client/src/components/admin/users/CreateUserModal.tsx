import type { CreateUserPayload } from '@/services/user.service'
import type { UserRole } from '@/types'
import type { Batch } from '@/services/faculty.service'
import type { Faculty } from '@/types'
import PasswordInput from '@/components/ui/PasswordInput'
import { ALL_ROLES, getRoleLabel } from './types'

interface CreateUserModalProps {
  form: CreateUserPayload
  setForm: (updater: (f: CreateUserPayload) => CreateUserPayload) => void
  batches: Batch[]
  facultyList: Faculty[]
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function CreateUserModal({ form, setForm, batches, facultyList, error, saving, onClose, onSubmit }: CreateUserModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Create User"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 520, border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, margin: 0 }}>Create User</h2>
          <button onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}
          <div className="input-group">
            <div className="form-group">
              <label className="label">Username</label>
              <input className="input" autoFocus value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                autoComplete="off" placeholder="e.g. john_doe" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Password</label>
              <PasswordInput
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
                placeholder="Min 8 chars · upper · lower · digit · symbol"
              />
            </div>
            <div className="form-group">
              <label className="label">Role</label>
              <select className="input" value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole, batchType: '' }))}>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
              </select>
            </div>
            {form.role === 'ACADEMICS_MANAGER' && (
              <div className="form-group">
                <label className="label">Batch Type Scope <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(leave blank for all)</span></label>
                <select className="input" value={form.batchType}
                  onChange={(e) => setForm((f) => ({ ...f, batchType: e.target.value }))}>
                  <option value="">— All batch types —</option>
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="label">Batch (optional)</label>
              <select className="input" value={form.batchId}
                onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}>
                <option value="">— none —</option>
                {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            {form.role === 'FACULTY' && (
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="label">Link Faculty Profile (optional)</label>
                <select className="input" value={form.facultyId}
                  onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}>
                  <option value="">— none —</option>
                  {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name} ({f.subject})</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
            {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Creating…</> : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}
