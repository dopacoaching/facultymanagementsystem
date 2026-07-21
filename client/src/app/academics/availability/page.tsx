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
import {
  AvailabilityFilterBar, AddDatesCard, AvailabilityEntriesCard,
} from '@/components/academics/availability'

export default function AvailabilityPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const now = new Date()

  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())

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

  // Load entries when faculty/month/year changes
  useEffect(() => {
    if (!accessToken || !selectedFaculty) { setEntries([]); return }
    setLoadingEntries(true)
    setEntries([]) // clear stale data from previous selection immediately
    getAvailability(selectedFaculty, month, year, accessToken)
      .then(setEntries)
      .catch((err) => { console.error(err); setEntries([]) })
      .finally(() => setLoadingEntries(false))
  }, [accessToken, selectedFaculty, month, year])

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

  // Month date range for the date picker
  const minDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const maxDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return (
    <div>
      <AvailabilityFilterBar
        faculty={faculty}
        selectedFaculty={selectedFaculty}
        onFacultyChange={(id) => { setSelectedFaculty(id); setStagingDates([]) }}
        month={month}
        onMonthChange={(m) => { setMonth(m); setStagingDates([]) }}
        year={year}
        onYearChange={(y) => { setYear(y); setStagingDates([]) }}
      />

      {!selectedFaculty && (
        <div className="card">
          <EmptyState
            icon="📅"
            title="Select a faculty member"
            description="Choose a faculty member from the dropdown above to view and manage their monthly availability."
          />
        </div>
      )}

      {selectedFaculty && (
        <>
          <AddDatesCard
            selectedFacultyObj={selectedFacultyObj}
            month={month}
            year={year}
            pendingDate={pendingDate}
            onPendingDateChange={setPendingDate}
            minDate={minDate}
            maxDate={maxDate}
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
            month={month}
            year={year}
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
