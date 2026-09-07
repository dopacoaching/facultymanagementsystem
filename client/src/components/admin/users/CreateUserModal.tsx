import type { CreateUserPayload } from '@/services/user.service'
import type { UserRole } from '@/types'
import type { Batch } from '@/services/faculty.service'
import type { Campus } from '@/services/campus.service'
import type { Faculty } from '@/types'
import PasswordInput from '@/components/ui/PasswordInput'
import { ALL_ROLES, getRoleLabel } from './types'

interface CreateUserModalProps {
  form: CreateUserPayload
  setForm: (updater: (f: CreateUserPayload) => CreateUserPayload) => void
  batches: Batch[]
  campuses: Campus[]
  facultyList: Faculty[]
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function CreateUserModal({ form, setForm, batches, campuses, facultyList, error, saving, onClose, onSubmit }: CreateUserModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Create User"
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="modal-panel modal-md">
        <div className="modal-header">
          <h2>Create User</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="modal-close">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        <div className="modal-body">
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
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole, batchType: '', campusId: '' }))}>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
              </select>
            </div>
            {form.role === 'IG_CLASS_TEACHER' && (
              <div className="form-group">
                <label className="label">Campus</label>
                <select className="input" value={form.campusId ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, campusId: e.target.value }))}>
                  <option value="">— none —</option>
                  {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            )}
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
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" /> Creating…</> : 'Create User'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
