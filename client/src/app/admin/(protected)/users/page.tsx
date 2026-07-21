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
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { validatePasswordComplexity, CreateUserModal, EditUserModal, UsersTable } from '@/components/admin/users'

export default function AdminUsersPage() {
  const { accessToken, userId: selfId } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const [users, setUsers]             = useState<AppUser[]>([])
  const [batches, setBatches]         = useState<Batch[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    username: '', password: '', role: 'COORDINATOR', facultyId: '', batchId: '', batchType: '',
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit modal
  const [editTarget, setEditTarget]     = useState<AppUser | null>(null)
  const [editRole, setEditRole]         = useState<UserRole>('COORDINATOR')
  const [editBatchId, setEditBatchId]   = useState('')
  const [editBatchType, setEditBatchType] = useState('')
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
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!payload.batchId)   delete payload.batchId
      if (!payload.batchType) delete payload.batchType
      await createUser(payload, accessToken)
      toast.success('User created', `@${createForm.username} has been added.`)
      setShowCreate(false)
      setCreateForm({ username: '', password: '', role: 'COORDINATOR', facultyId: '', batchId: '', batchType: '' })
      load()
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Create failed')
    } finally { setCreating(false) }
  }

  function openEdit(u: AppUser) {
    setEditTarget(u)
    setEditRole(u.role)
    setEditBatchId(typeof u.batchId === 'object' ? (u.batchId?._id ?? '') : (u.batchId ?? ''))
    setEditBatchType(u.batchType ?? '')
    setEditPw('')
    setEditError('')
  }

  async function handleToggleActive(u: AppUser) {
    if (!accessToken || toggling === u._id) return
    if (u._id === selfId) { setError('You cannot deactivate your own account.'); return }
    setToggling(u._id); setError('')
    try {
      await updateUser(u._id, { isActive: !u.isActive }, accessToken)
      toast.success(u.isActive ? 'User deactivated' : 'User reactivated', `@${u.username} status updated.`)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally { setToggling('') }
  }

  async function handleEditSave() {
    if (!accessToken || !editTarget) return
    setEditSaving(true); setEditError('')
    try {
      const payload: { role: UserRole; batchId?: string | null; batchType?: string | null; password?: string } = {
        role:      editRole,
        batchId:   editBatchId   || null,
        batchType: editRole === 'ACADEMICS_MANAGER' ? (editBatchType || null) : null,
      }
      if (editPw) {
        const pwErr = validatePasswordComplexity(editPw)
        if (pwErr) { setEditError(pwErr); setEditSaving(false); return }
        payload.password = editPw
      }
      await updateUser(editTarget._id, payload, accessToken)
      toast.success('User updated', `@${editTarget.username} has been saved.`)
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
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} onRetry={() => setError('')} />
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          form={createForm}
          setForm={setCreateForm}
          batches={batches}
          facultyList={facultyList}
          error={createError}
          saving={creating}
          onClose={() => { setShowCreate(false); setCreateError('') }}
          onSubmit={handleCreate}
        />
      )}

      {editTarget && (
        <EditUserModal
          editTarget={editTarget}
          editRole={editRole}
          onRoleChange={setEditRole}
          editBatchId={editBatchId}
          onBatchIdChange={setEditBatchId}
          editBatchType={editBatchType}
          onBatchTypeChange={setEditBatchType}
          editPw={editPw}
          onPwChange={setEditPw}
          batches={batches}
          error={editError}
          saving={editSaving}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEditSave}
        />
      )}

      <div className="card">
        <UsersTable
          loading={loading}
          users={users}
          selfId={selfId}
          toggling={toggling}
          onEdit={openEdit}
          onToggleActive={handleToggleActive}
          onNewUser={() => setShowCreate(true)}
        />
      </div>
    </div>
  )
}
