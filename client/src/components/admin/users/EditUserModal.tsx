import { useRef } from 'react'
import type { AppUser } from '@/services/user.service'
import type { UserRole } from '@/types'
import type { Batch } from '@/services/faculty.service'
import type { Campus } from '@/services/campus.service'
import PasswordInput from '@/components/ui/PasswordInput'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Icon } from '@/components/ui/Icon'
import { ALL_ROLES, getRoleLabel } from './types'
import s from './Users.module.css'

interface EditUserModalProps {
  editTarget: AppUser
  editRole: UserRole
  onRoleChange: (r: UserRole) => void
  editBatchId: string
  onBatchIdChange: (id: string) => void
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

const FORM_ID = 'edit-user-form'
const TITLE_ID = 'edit-user-title'

export function EditUserModal({
  editTarget, editRole, onRoleChange, editBatchId, onBatchIdChange,
  editCampusId, onCampusIdChange, editPw, onPwChange, batches, campuses, error, saving, onClose, onSubmit,
}: EditUserModalProps) {
  const roleRef = useRef<HTMLSelectElement>(null)

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      labelledById={TITLE_ID}
      initialFocus={roleRef}
      title={
        <div className={s.modalTitle}>
          <h2 id={TITLE_ID}>Edit User</h2>
          <p className={s.modalSub}>@{editTarget.username}</p>
        </div>
      }
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="form-stack" style={{ gap: 'var(--space-4)' }}>
        {error && (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        <div className={s.formGrid}>
          <FormField label="Role">
            <select ref={roleRef} className="input" value={editRole}
              onChange={(e) => { onRoleChange(e.target.value as UserRole); onCampusIdChange('') }}>
              {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
            </select>
          </FormField>

          {editRole === 'IG_CLASS_TEACHER' && (
            <FormField label="Campus">
              <select className="input" value={editCampusId}
                onChange={(e) => onCampusIdChange(e.target.value)}>
                <option value="">— none —</option>
                {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </FormField>
          )}

          <FormField label="Batch (optional)">
            <select className="input" value={editBatchId}
              onChange={(e) => onBatchIdChange(e.target.value)}>
              <option value="">— none —</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </FormField>

          <div className={`form-group ${s.span2}`}>
            <label className="label" htmlFor="edit-user-password">
              Reset Password <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(leave blank to keep current)</span>
            </label>
            <PasswordInput
              id="edit-user-password"
              value={editPw}
              onChange={(e) => onPwChange(e.target.value)}
              autoComplete="new-password"
              placeholder="Min 8 chars · upper · lower · digit · symbol"
              showStrength={editPw.length > 0}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
