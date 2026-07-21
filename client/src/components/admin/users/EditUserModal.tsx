import type { AppUser } from '@/services/user.service'
import type { UserRole } from '@/types'
import type { Batch } from '@/services/faculty.service'
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
  editPw: string
  onPwChange: (pw: string) => void
  batches: Batch[]
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function EditUserModal({
  editTarget, editRole, onRoleChange, editBatchId, onBatchIdChange, editBatchType, onBatchTypeChange,
  editPw, onPwChange, batches, error, saving, onClose, onSubmit,
}: EditUserModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Edit User"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 480, border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontWeight: 700, margin: 0 }}>Edit User</h2>
            <p style={{ margin: '0.125rem 0 0', fontSize: '0.875rem', color: 'var(--color-muted)' }}>@{editTarget.username}</p>
          </div>
          <button onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}
          <div className="input-group">
            <div className="form-group">
              <label className="label">Role</label>
              <select className="input" value={editRole}
                onChange={(e) => { onRoleChange(e.target.value as UserRole); onBatchTypeChange('') }}>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
              </select>
            </div>
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
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
            {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
