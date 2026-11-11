'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, create, update } from '@/services/faculty.service'
import { normalizePhone } from '@/lib/utils/phone'
import type { Faculty } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'
import { EMPTY_FACULTY, FacultyTable, FacultyEditModal, ConfigurePayModal } from '@/components/hr/faculty'
import s from '@/components/hr/faculty/Faculty.module.css'

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

  const searchDigits = search.replace(/\D/g, '')
  const filtered = list.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.subject.toLowerCase().includes(search.toLowerCase()) ||
    (searchDigits.length > 0 && (f.phone ?? '').replace(/\D/g, '').includes(searchDigits))
  )

  async function handleSave() {
    if (!accessToken || !editing) return
    const phone = normalizePhone((editing as Faculty).phone)
    if (!phone.ok) { setError(phone.error); return }
    // Send the tidied number; an emptied field clears it on an existing record.
    const payload = { ...editing, phone: phone.value }
    setSaving(true); setError('')
    try {
      if ('_id' in editing) {
        await update(editing._id, payload as Partial<Faculty>, accessToken)
        toast.success('Faculty updated', 'Changes have been saved.')
      } else {
        await create(payload as Omit<Faculty, '_id'>, accessToken)
        toast.success('Faculty added', 'New faculty member has been created.')
      }
      setEditing(null); load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Faculty</h1>
          <p className="page-subtitle">
            {list.length} faculty member{list.length !== 1 ? 's' : ''}
            {search && filtered.length !== list.length ? ` · ${filtered.length} shown` : ''}
          </p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setEditing(EMPTY_FACULTY)}>
            <Icon name="plus" size={16} /> Add Faculty
          </button>
        </div>
      </div>

      <div className="toolbar" role="search">
        <div className={`form-group ${s.searchGroup}`}>
          <label className="label" htmlFor="faculty-search">Search</label>
          <div className={s.searchBox}>
            <span className={s.searchIcon}><Icon name="search" size={16} /></span>
            <input
              id="faculty-search" className={`input ${s.searchInput}`} placeholder="Search by name, subject or phone…"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div aria-live="polite">
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
