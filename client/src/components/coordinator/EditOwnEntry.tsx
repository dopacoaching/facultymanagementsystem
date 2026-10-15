'use client'
import { useState } from 'react'
import type { Session } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { todayLocal } from '@/utils/date'
import { EditClassSessionModal, formFromSession, timingChanged, type EditClassSessionForm } from '@/components/hr/reports/EditClassSessionModal'
import { usesFullBreak } from '@/lib/constants/entryTypes'
import { computeDuration, computeShootDuration } from '@/components/coordinator/log-session'

type SaveFn = (sessionId: string, data: Record<string, unknown>) => Promise<unknown>

/**
 * Lets a class teacher correct an entry they pushed (the server enforces the
 * 24-hour window and ownership). Reuses the HR edit form, minus the fields a
 * teacher may not change.
 */
export function EditOwnEntry({ session, teacherNames, save, onClose, onSaved }: {
  session: Session
  teacherNames: string[]
  save: SaveFn
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<EditClassSessionForm>(() => formFromSession(session))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    const isShoot = form.entryType === 'SHOOT'
    const changed = timingChanged(form, formFromSession(session))
    const classDuration = isShoot ? null : computeDuration(form.startTime, form.endTime, form.breaks, { fullBreak: usesFullBreak(form.entryType) })
    const duration = classDuration ?? computeShootDuration(form.shootHours, form.shootMinutes)
    if (changed && duration.error) { setError(duration.error); return }
    if (!form.sessionDate) { setError('Select the date'); return }
    if (!form.subject.trim()) { setError('Subject is required'); return }
    if (!form.chapter.trim()) { setError('Chapter is required'); return }

    setSaving(true); setError('')
    try {
      await save(session._id, {
        subject:       form.subject.trim(),
        chapter:       form.chapter.trim(),
        classMode:     form.classMode || undefined,
        updatedByName: form.updatedByName.trim() || undefined,
        sessionDate:   form.sessionDate,
        // Timing is only sent when it changed — the server recalculates hours from it
        // (a Shoot's multiplier, a Live entry's full break), so an unrelated edit
        // never alters hours saved under an older rule.
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
      })
      toast.success('Entry updated', 'Your changes have been saved.')
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update the entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <EditClassSessionModal
      form={form}
      setForm={(u) => setForm(u)}
      error={error}
      saving={saving}
      onClose={onClose}
      onSubmit={submit}
      teacherNames={teacherNames}
      maxDate={todayLocal()}
    />
  )
}
