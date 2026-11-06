import { useRef } from 'react'
import type { CreateUserPayload } from '@/services/user.service'
import type { UserRole } from '@/types'
import type { Batch } from '@/services/faculty.service'
import type { Campus } from '@/services/campus.service'
import type { Faculty } from '@/types'
import PasswordInput from '@/components/ui/PasswordInput'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Icon } from '@/components/ui/Icon'
import { ALL_ROLES, getRoleLabel } from './types'
import s from './Users.module.css'

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

const FORM_ID = 'create-user-form'

export function CreateUserModal({ form, setForm, batches, campuses, facultyList, error, saving, onClose, onSubmit }: CreateUserModalProps) {
  const usernameRef = useRef<HTMLInputElement>(null)

  return (
    <Modal
      open
      onClose={onClose}
      title="Create User"
      size="md"
      initialFocus={usernameRef}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" /> Creating…</> : 'Create User'}
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
          <FormField label="Username" required>
            <input ref={usernameRef} className="input" value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              autoComplete="off" placeholder="e.g. john_doe" />
          </FormField>

          <FormField label="Role" required>
            <select className="input" value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole, campusId: '' }))}>
              {ALL_ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
            </select>
          </FormField>

          <div className={`form-group ${s.span2}`}>
            <label className="label" htmlFor="create-user-password">Password <span className="label-required" aria-hidden="true">*</span></label>
            <PasswordInput
              id="create-user-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              placeholder="Min 8 chars · upper · lower · digit · symbol"
            />
          </div>

          {form.role === 'IG_CLASS_TEACHER' && (
            <FormField label="Campus">
              <select className="input" value={form.campusId ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, campusId: e.target.value }))}>
                <option value="">— none —</option>
                {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </FormField>
          )}

          <FormField label="Batch (optional)">
            <select className="input" value={form.batchId}
              onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}>
              <option value="">— none —</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </FormField>

          {form.role === 'FACULTY' && (
            <FormField label="Link Faculty Profile (optional)" className={s.span2}>
              <select className="input" value={form.facultyId}
                onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}>
                <option value="">— none —</option>
                {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name} ({f.subject})</option>)}
              </select>
            </FormField>
          )}
        </div>
      </form>
    </Modal>
  )
}
