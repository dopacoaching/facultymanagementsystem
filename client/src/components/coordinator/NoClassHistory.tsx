'use client'
import { useId, useState } from 'react'
import { listNoClass, updateNoClassEntry, type NoClassDoc } from '@/services/entries.service'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'
import { editWindowRemainingMs, formatTimeLeft } from '@/lib/utils/teacherEdit'
import { toLocalISO, todayLocal } from '@/utils/date'
import { CheckRow } from './EntryParts'
import { FIXED_REASONS, OTHER } from './NoClassCard'
import s from './Entry.module.css'

type Batch = { _id: string; name: string }

const dayOf = (n: NoClassDoc) => n.day ?? toLocalISO(new Date(n.date))
function fmtDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function EditNoClassEntry({ entry, teachers, batches, accessToken, onClose, onSaved }: {
  entry: NoClassDoc
  teachers: string[]
  batches: Batch[]
  accessToken: string
  onClose: () => void
  onSaved: () => void
}) {
  const uid = useId()
  const toast = useToast()
  const today = todayLocal()
  const known = FIXED_REASONS.includes(entry.reason ?? '')
  const [date, setDate] = useState(dayOf(entry).slice(0, 10))
  const [by, setBy] = useState(entry.markedByName ?? '')
  const [reasonKind, setReasonKind] = useState(known ? (entry.reason as string) : OTHER)
  const [otherReason, setOtherReason] = useState(known ? '' : entry.reason ?? '')
  const [batchIds, setBatchIds] = useState<string[]>((entry.batchIds ?? []).map(String))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const reason = reasonKind === OTHER ? otherReason.trim() : reasonKind
    if (!date) { setError('Select the date'); return }
    if (!reason) { setError('Enter the reason for no class'); return }
    setSaving(true); setError('')
    try {
      await updateNoClassEntry(entry._id, { date, reason, markedByName: by || undefined, batchIds }, accessToken)
      toast.success('No Class updated', 'Your changes have been saved.')
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open onClose={onClose} title="Edit No Class" size="md"
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form={`${uid}-form`} className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner spinner-on-solid" /> Saving…</> : 'Save Changes'}
          </button>
        </>
      )}
    >
      <form id={`${uid}-form`} className="form-stack" onSubmit={(e) => { e.preventDefault(); save() }}>
        {error && <ErrorAlert message={error} />}
        <div className="input-group">
          <FormField label="Date" htmlFor={`${uid}-date`} required>
            <input id={`${uid}-date`} type="date" className="input" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Marked by" htmlFor={`${uid}-by`}>
            <select id={`${uid}-by`} className="input" value={by} onChange={(e) => setBy(e.target.value)}>
              <option value="">— select —</option>
              {by && !teachers.includes(by) && <option value={by}>{by}</option>}
              {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
        </div>
        {batches.length > 1 && (
          <FormField label="Batches" htmlFor={`${uid}-batches`} hint="Tick only the batches that had no class. Leave all unticked if the whole campus had none.">
            <div id={`${uid}-batches`} role="group" aria-label="Batches" className={s.checkList}>
              {batches.map((b) => {
                const checked = batchIds.includes(b._id)
                return (
                  <CheckRow key={b._id} checked={checked}
                    onChange={() => setBatchIds(checked ? batchIds.filter((id) => id !== b._id) : [...batchIds, b._id])}>
                    {b.name}
                  </CheckRow>
                )
              })}
            </div>
          </FormField>
        )}
        <FormField label="Reason" htmlFor={`${uid}-reason`} required>
          <select id={`${uid}-reason`} className="input" value={reasonKind} onChange={(e) => setReasonKind(e.target.value)}>
            {FIXED_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value={OTHER}>Other</option>
          </select>
        </FormField>
        {reasonKind === OTHER && (
          <FormField label="Enter the reason" htmlFor={`${uid}-other`} required>
            <input id={`${uid}-other`} className="input" value={otherReason} maxLength={120} onChange={(e) => setOtherReason(e.target.value)} />
          </FormField>
        )}
      </form>
    </Modal>
  )
}

/**
 * The No Class days a campus login marked on the Push Board, for the history pages.
 * Each can be edited for 24 hours after it was marked (the server enforces it).
 */
export function NoClassHistory({ accessToken, from, to, teachers, batches, reloadKey }: {
  accessToken: string
  from: string
  to: string
  teachers: string[]
  batches: Batch[]
  /** Changes when the page reloads its sessions, so this list reloads with it. */
  reloadKey?: number
}) {
  const days = useAsyncResource(() => listNoClass(from, to, accessToken), [accessToken, from, to, reloadKey], { enabled: !!accessToken && !!from && !!to })
  const [editing, setEditing] = useState<NoClassDoc | null>(null)
  const rows = days.data ?? []

  if (days.status === 'error') {
    return <div style={{ marginTop: 'var(--space-4)' }}><ErrorAlert message={days.error?.message ?? ''} what="Couldn't load your No Class days" onRetry={days.refetch} /></div>
  }
  if (rows.length === 0) return null

  return (
    <section style={{ marginTop: 'var(--space-6)' }} aria-labelledby="nc-history">
      <h2 id="nc-history" className="section-label">No Class days</h2>
      <div className="card card-flush">
        <div className="table-wrapper table-stack">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Batches</th>
                <th>Reason</th>
                <th>Marked By</th>
                <th><span className={s.srOnly}>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const left = editWindowRemainingMs(n.createdAt)
                return (
                  <tr key={n._id}>
                    <td data-label="Date" className={`${s.secondary} ${s.nowrap}`}>{fmtDay(dayOf(n))}</td>
                    <td data-label="Batches" className={s.secondary}>
                      {n.batchIds?.length
                        ? (n.batchNames?.length ? n.batchNames.join(', ') : n.batchIds.map((id) => batches.find((b) => b._id === id)?.name ?? 'Batch').join(', '))
                        : 'Whole campus'}
                    </td>
                    <td data-label="Reason" className={s.strong}>{n.reason || '—'}</td>
                    <td data-label="Marked By" className={s.secondary}>{n.markedByName ?? '—'}</td>
                    <td data-label="Actions" className={s.actionCell}>
                      {left > 0 && (
                        <span className={s.editCell}>
                          <span className={s.timeLeft}>{formatTimeLeft(left)}</span>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(n)}>
                            <Icon name="edit" size={14} /> Edit
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditNoClassEntry
          entry={editing} teachers={teachers} batches={batches} accessToken={accessToken}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); days.refetch() }}
        />
      )}
    </section>
  )
}
