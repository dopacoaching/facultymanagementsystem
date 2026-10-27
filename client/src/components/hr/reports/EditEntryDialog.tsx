'use client'
import { useEffect, useState } from 'react'
import { getAll as getClassSessions, update as updateClassSession } from '@/services/session.service'
import { getAll as getIGSessions, update as updateIGSession } from '@/services/ig-session.service'
import { getBatches, type Batch } from '@/services/faculty.service'
import type { EntryRow } from '@/services/entries.service'
import { useActiveFaculty } from '@/hooks/useActiveFaculty'
import { useChapterOptions } from '@/components/coordinator/log-session/ChaptersField'
import { computeDuration, computeShootDuration } from '@/components/coordinator/log-session'
import { usesFullBreak } from '@/lib/constants/entryTypes'
import { useToast } from '@/components/ui/Toast'
import { EditClassSessionModal, formFromSession, timingChanged, type EditClassSessionForm } from './EditClassSessionModal'
import { EditIGSessionReportModal, formFromIGSession, type EditIGSessionForm } from './EditIGSessionReportModal'
import type { Session } from '@/types'

const batchIdsOf = (s: Session) => [s.batchId, ...(s.extraBatchIds ?? [])].filter((id): id is string => !!id)
const campusIdOf = (b: Batch) => (typeof b.campusId === 'object' ? b.campusId._id : b.campusId)

interface EditorProps {
  session: Session
  accessToken: string
  onClose: () => void
  onSaved: () => void
}

function ClassEditor({ session, accessToken, onClose, onSaved }: EditorProps) {
  const toast = useToast()
  const [form, setForm] = useState<EditClassSessionForm>(() => formFromSession(session))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [batchOptions, setBatchOptions] = useState<Batch[]>([])
  const [batchIds, setBatchIds] = useState<string[]>(() => batchIdsOf(session))
  const faculty = useActiveFaculty(accessToken)
  const { options: chapterOptions } = useChapterOptions(form.subject, accessToken)
  useEffect(() => { getBatches(accessToken).then(setBatchOptions).catch(() => setBatchOptions([])) }, [accessToken])

  // HR can only regroup batches inside the entry's own campus.
  const campusId = batchOptions.find((b) => b._id === session.batchId)?.campusId
  const pickerBatches = campusId === undefined ? [] : batchOptions.filter((b) => campusIdOf(b) === (typeof campusId === 'object' ? campusId._id : campusId))

  async function save() {
    const original = formFromSession(session)
    const isShoot = form.entryType === 'SHOOT'
    const changed = timingChanged(form, original)
    const classDuration = isShoot ? null : computeDuration(form.startTime, form.endTime, form.breaks, { fullBreak: usesFullBreak(form.entryType) })
    const duration = classDuration ?? computeShootDuration(form.shootHours, form.shootMinutes)
    if (changed && duration.error) { setError(duration.error); return }
    const before = batchIdsOf(session)
    const batchesChanged = batchIds.length !== before.length || batchIds.some((id) => !before.includes(id))
    if (pickerBatches.length > 1 && batchIds.length === 0) { setError('Select at least one batch'); return }

    setSaving(true); setError('')
    try {
      await updateClassSession(session._id, {
        ...(form.facultyId !== original.facultyId ? { facultyId: form.facultyId } : {}),
        subject:       form.subject.trim(),
        chapters:      form.chapters,
        classMode:     form.classMode || undefined,
        updatedByName: form.updatedByName.trim() || undefined,
        ...(form.comment.trim() !== (session.comment ?? '').trim() ? { comment: form.comment.trim() } : {}),
        // Timing is only sent when it changed — the server recalculates hours from it.
        ...(changed
          ? {
              durationHours: duration.hours,
              entryType:     form.entryType || undefined,
              ...(classDuration
                ? {
                    startTime:             form.startTime,
                    endTime:               form.endTime,
                    breakMinutes:          classDuration.morningBreak,
                    lunchBreakMinutes:     classDuration.lunchBreak,
                    afternoonBreakMinutes: classDuration.afternoonBreak,
                  }
                : {}),
            }
          : {}),
        sessionDate:   form.sessionDate,
        ...(batchesChanged && batchIds.length ? { batchIds } : {}),
      }, accessToken)
      toast.success('Entry updated', 'The changes have been saved.')
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update the entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <EditClassSessionModal
      form={form} setForm={(u) => setForm((f) => u(f))} error={error} saving={saving}
      onClose={onClose} onSubmit={save} chapterOptions={chapterOptions} faculty={faculty}
      batches={pickerBatches} batchIds={batchIds} onBatchIdsChange={setBatchIds}
    />
  )
}

function IGEditor({ session, accessToken, onClose, onSaved }: EditorProps) {
  const toast = useToast()
  const [form, setForm] = useState<EditIGSessionForm>(() => formFromIGSession(session))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [batchOptions, setBatchOptions] = useState<Batch[]>([])
  const [batchIds, setBatchIds] = useState<string[]>(() => batchIdsOf(session))
  const faculty = useActiveFaculty(accessToken)
  const { options: chapterOptions } = useChapterOptions(form.subject, accessToken)
  useEffect(() => { getBatches(accessToken).then(setBatchOptions).catch(() => setBatchOptions([])) }, [accessToken])

  // HR can move an IG entry to any IG batch; the server checks that the selection is one school.
  const igBatches = batchOptions
    .filter((b) => b.type === 'IG')
    .map((b) => ({ _id: b._id, name: typeof b.campusId === 'object' ? `${b.name} · ${b.campusId.name}` : b.name }))

  async function save() {
    const duration = computeDuration(form.startTime, form.endTime, form.breaks)
    if (duration.error) { setError(duration.error); return }
    if (!form.timeSlot) { setError('Select the session slot'); return }
    if (batchIds.length === 0) { setError('Select at least one batch'); return }
    const before = batchIdsOf(session)
    const batchesChanged = batchIds.length !== before.length || batchIds.some((id, i) => id !== before[i])

    setSaving(true); setError('')
    try {
      await updateIGSession(session._id, {
        ...(form.facultyId !== formFromIGSession(session).facultyId ? { facultyId: form.facultyId } : {}),
        subject:       form.subject.trim(),
        chapters:      form.chapters,
        timeSlot:      form.timeSlot,
        updatedByName: form.updatedByName.trim() || undefined,
        ...(form.comment.trim() !== (session.comment ?? '').trim() ? { comment: form.comment.trim() } : {}),
        startTime:     form.startTime,
        endTime:       form.endTime,
        breakMinutes:          duration.morningBreak,
        lunchBreakMinutes:     duration.lunchBreak,
        afternoonBreakMinutes: duration.afternoonBreak,
        durationHours: duration.hours,
        sessionDate:   form.sessionDate,
        ...(batchesChanged ? { batchIds } : {}),
      }, accessToken)
      toast.success('Entry updated', 'The changes have been saved.')
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update the entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <EditIGSessionReportModal
      form={form} setForm={(u) => setForm((f) => u(f))} error={error} saving={saving}
      onClose={onClose} onSubmit={save} chapterOptions={chapterOptions} faculty={faculty}
      batches={igBatches} batchIds={batchIds} onBatchIdsChange={setBatchIds}
    />
  )
}

/** Full edit of one Entries Report row: loads the complete session, then opens the matching
 *  editor (campus class or Integrated School). */
export function EditEntryDialog({ entry, accessToken, onClose, onSaved }: {
  entry: EntryRow
  accessToken: string
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [session, setSession] = useState<Session | null>(null)
  useEffect(() => {
    let live = true
    const filters = { facultyId: entry.facultyId, from: entry.date, to: entry.date }
    const request = entry.isIG ? getIGSessions(filters, accessToken) : getClassSessions(filters, accessToken)
    request
      .then((list) => {
        if (!live) return
        const found = list.find((s) => s._id === entry._id)
        if (found) setSession(found)
        else { toast.error('Could not open the entry', 'It was not found — refresh the report.'); onClose() }
      })
      .catch((e: unknown) => {
        if (!live) return
        toast.error('Could not open the entry', e instanceof Error ? e.message : 'Failed to load the entry')
        onClose()
      })
    return () => { live = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry._id, accessToken])

  if (!session) return null
  const Editor = entry.isIG ? IGEditor : ClassEditor
  return <Editor session={session} accessToken={accessToken} onClose={onClose} onSaved={onSaved} />
}
