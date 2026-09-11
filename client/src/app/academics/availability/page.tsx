'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFacultyList } from '@/services/faculty.service'
import type { Faculty } from '@/types'
import {
  getAvailability,
  addAvailabilityDates,
  updateAvailabilityEntry,
  deleteAvailabilityEntry,
} from '@/services/availability.service'
import type { AvailabilityEntry, AvailabilityStatus } from '@/services/availability.service'
import { EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { toLocalISO } from '@/utils/date'
import {
  AddDatesCard, AvailabilityEntriesCard,
} from '@/components/academics/availability'

export default function AvailabilityPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const now = new Date()

  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to,   setTo]   = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)))

  const [faculty,         setFaculty]         = useState<Faculty[]>([])
  const [selectedFaculty, setSelectedFaculty] = useState<string>('')
  const [entries,         setEntries]         = useState<AvailabilityEntry[]>([])
  const [loadingEntries,  setLoadingEntries]  = useState(false)

  // Add dates
  const [pendingDate,  setPendingDate]  = useState('')
  const [stagingDates, setStagingDates] = useState<string[]>([])
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState('')

  // Edit entry
  const [editingId,     setEditingId]     = useState<string | null>(null)
  const [editStatus,    setEditStatus]    = useState<AvailabilityStatus>('AVAILABLE')
  const [editRemark,    setEditRemark]    = useState('')
  const [editSaving,    setEditSaving]    = useState(false)
  const [editError,     setEditError]     = useState('')

  // Load faculty list once
  useEffect(() => {
    if (!accessToken) return
    getFacultyList(accessToken)
      .then((list) => setFaculty(list.filter((f) => f.isActive)))
      .catch(console.error)
  }, [accessToken])

  // Load entries when faculty/range changes
  useEffect(() => {
    if (!accessToken || !selectedFaculty || !from || !to) { setEntries([]); return }
    setLoadingEntries(true)
    setEntries([]) // clear stale data from previous selection immediately
    getAvailability(selectedFaculty, from, to, accessToken)
      .then(setEntries)
      .catch((err) => { console.error(err); setEntries([]) })
      .finally(() => setLoadingEntries(false))
  }, [accessToken, selectedFaculty, from, to])

  function addToStaging() {
    if (!pendingDate) return
    // Prevent duplicates in staging or already-saved entries
    const alreadySaved = entries.some((e) => e.date.startsWith(pendingDate))
    const alreadyStaged = stagingDates.includes(pendingDate)
    if (alreadySaved || alreadyStaged) return
    setStagingDates((prev) => [...prev, pendingDate].sort())
    setPendingDate('')
  }

  async function saveAvailability() {
    if (!accessToken || !selectedFaculty || stagingDates.length === 0) return
    setSaving(true); setSaveError('')
    try {
      const updated = await addAvailabilityDates(selectedFaculty, stagingDates, accessToken)
      setEntries(updated)
      setStagingDates([])
      toast.success('Availability saved', `${stagingDates.length} date${stagingDates.length !== 1 ? 's' : ''} added successfully.`)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  function startEdit(entry: AvailabilityEntry) {
    setEditingId(entry._id)
    setEditStatus(entry.status)
    setEditRemark(entry.remark ?? '')
    setEditError('')
  }

  async function saveEdit() {
    if (!accessToken || !editingId) return
    if (editStatus !== 'AVAILABLE' && !editRemark.trim()) {
      setEditError('A remark is required for Rescheduled or Cancelled status')
      return
    }
    setEditSaving(true); setEditError('')
    try {
      const updated = await updateAvailabilityEntry(editingId, editStatus, editRemark, accessToken)
      setEntries((prev) => prev.map((e) => e._id === editingId ? updated : e))
      setEditingId(null)
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Failed to update')
    } finally { setEditSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return
    try {
      await deleteAvailabilityEntry(id, accessToken)
      setEntries((prev) => prev.filter((e) => e._id !== id))
      if (editingId === id) setEditingId(null)
    } catch (e: unknown) {
      console.error(e)
    }
  }

  const selectedFacultyObj = faculty.find((f) => f._id === selectedFaculty)
  const periodLabel = `${from} to ${to}`

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="label">Faculty</label>
          <select
            className="input"
            value={selectedFaculty}
            onChange={(e) => { setSelectedFaculty(e.target.value); setStagingDates([]) }}
            style={{ maxWidth: 320 }}
          >
            <option value="">— Select faculty —</option>
            {faculty.map((f) => (
              <option key={f._id} value={f._id}>{f.name} ({f.subject})</option>
            ))}
          </select>
        </div>
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={(v) => { setFrom(v); setStagingDates([]) }}
          onToChange={(v) => { setTo(v); setStagingDates([]) }}
        />
      </div>

      {!selectedFaculty && (
        <div className="card">
          <EmptyState
            title="Select a faculty member"
            description="Choose a faculty member from the dropdown above to view and manage their monthly availability."
          />
        </div>
      )}

      {selectedFaculty && (
        <>
          <AddDatesCard
            selectedFacultyObj={selectedFacultyObj}
            periodLabel={periodLabel}
            pendingDate={pendingDate}
            onPendingDateChange={setPendingDate}
            minDate={from}
            maxDate={to}
            onAddToStaging={addToStaging}
            stagingDates={stagingDates}
            onRemoveStaged={(d) => setStagingDates((prev) => prev.filter((x) => x !== d))}
            saveError={saveError}
            saving={saving}
            onSave={saveAvailability}
          />

          <AvailabilityEntriesCard
            entries={entries}
            loadingEntries={loadingEntries}
            periodLabel={periodLabel}
            editingId={editingId}
            editStatus={editStatus}
            onEditStatusChange={setEditStatus}
            editRemark={editRemark}
            onEditRemarkChange={setEditRemark}
            editError={editError}
            editSaving={editSaving}
            onStartEdit={startEdit}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={saveEdit}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  )
}
