'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, create, update } from '@/services/faculty.service'
import type { Faculty } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { EMPTY_FACULTY, FacultyTable, FacultyEditModal, ConfigurePayModal } from '@/components/hr/faculty'

export default function FacultyPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const [list, setList]         = useState<Faculty[]>([])
  const [editing, setEditing]   = useState<(Faculty | typeof EMPTY_FACULTY) | null>(null)
  const [configuring, setConfiguring] = useState<Faculty | null>(null)
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')

  const load = useCallback(() => {
    if (!accessToken) return
    setLoading(true)
    getAll(accessToken, true)
      .then(setList)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken])

  useEffect(load, [load])

  const filtered = list.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.subject.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    if (!accessToken || !editing) return
    setSaving(true); setError('')
    try {
      if ('_id' in editing) {
        await update(editing._id, editing as Partial<Faculty>, accessToken)
        toast.success('Faculty updated', 'Changes have been saved.')
      } else {
        await create(editing as Omit<Faculty, '_id'>, accessToken)
        toast.success('Faculty added', 'New faculty member has been created.')
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
        <button className="btn btn-primary" onClick={() => setEditing(EMPTY_FACULTY)}>
          + Add Faculty
        </button>
      </div>

      <div className="card">
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', maxWidth: 360 }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }}>🔍</span>
            <input className="input" placeholder="Search by name or subject…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
          </div>
        </div>

        <FacultyTable
          loading={loading}
          filtered={filtered}
          search={search}
          onAdd={() => setEditing(EMPTY_FACULTY)}
          onEdit={setEditing}
          onConfigurePay={setConfiguring}
        />
      </div>

      {editing && (
        <FacultyEditModal
          editing={editing}
          setEditing={setEditing}
          error={error}
          saving={saving}
          onClose={() => { setEditing(null); setError('') }}
          onSave={handleSave}
        />
      )}

      {configuring && accessToken && (
        <ConfigurePayModal
          faculty={configuring}
          token={accessToken}
          onClose={() => setConfiguring(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
