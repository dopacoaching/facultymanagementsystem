import type { AppUser } from '@/services/user.service'
import type { UserRole } from '@/types'
import type { Batch } from '@/services/faculty.service'
import type { Campus } from '@/services/campus.service'
import PasswordInput from '@/components/ui/PasswordInput'
import { ALL_ROLES, getRoleLabel } from './types'

interface EditUserModalProps {
  editTarget: AppUser
  editRole: UserRole
  onRoleChange: (r: UserRole) => void
  editBatchId: string
  onBatchIdChange: (id: string) => void
  editBatchType: string
  onBatchTypeChange: (t: string) => void
  editCampusId: string
  onCampusIdChange: (id: string) => void
  editPw: string
  onPwChange: (pw: string) => void
  batches: Batch[]
  campuses: Campus[]
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function EditUserModal({
  editTarget, editRole, onRoleChange, editBatchId, onBatchIdChange, editBatchType, onBatchTypeChange,
  editCampusId, onCampusIdChange, editPw, onPwChange, batches, campuses, error, saving, onClose, onSubmit,
}: EditUserModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Edit User"
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <h2>Edit User</h2>
            <p style={{ margin: '0.125rem 0 0', fontSize: '0.875rem', color: 'var(--color-muted)' }}>@{editTarget.username}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="modal-close">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}
          <div className="input-group">
            <div className="form-group">
              <label className="label">Role</label>
              <select className="input" value={editRole}
                onChange={(e) => { onRoleChange(e.target.value as UserRole); onBatchTypeChange(''); onCampusIdChange('') }}>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
              </select>
            </div>
            {editRole === 'IG_CLASS_TEACHER' && (
              <div className="form-group">
                <label className="label">Campus</label>
                <select className="input" value={editCampusId}
                  onChange={(e) => onCampusIdChange(e.target.value)}>
                  <option value="">— none —</option>
                  {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {editRole === 'ACADEMICS_MANAGER' && (
              <div className="form-group">
                <label className="label">Batch Type Scope <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(leave blank for all)</span></label>
                <select className="input" value={editBatchType}
                  onChange={(e) => onBatchTypeChange(e.target.value)}>
                  <option value="">— All batch types —</option>
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="label">Batch (optional)</label>
              <select className="input" value={editBatchId}
                onChange={(e) => onBatchIdChange(e.target.value)}>
                <option value="">— none —</option>
                {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Reset Password <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(leave blank to keep current)</span></label>
              <PasswordInput
                value={editPw}
                onChange={(e) => onPwChange(e.target.value)}
                autoComplete="new-password"
                placeholder="Min 8 chars · upper · lower · digit · symbol"
                showStrength={editPw.length > 0}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
