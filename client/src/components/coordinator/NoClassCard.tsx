'use client'
import { useState } from 'react'
import { listNoClass, markNoClass, removeNoClass } from '@/services/entries.service'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { FormField } from '@/components/ui/FormField'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { addDays, toLocalISO, todayLocal } from '@/utils/date'

function fmtDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const FACULTY_CANCELLATION = 'Faculty cancellation'
const OTHER = 'OTHER'

/**
 * "No Class" marker for the coordinator's campus. A day with no entries and no
 * marker is red-flagged on the HR/Admin Entries Report, so days without any
 * teaching must be confirmed here.
 */
export function NoClassCard({ accessToken, teachers }: { accessToken: string; teachers: string[] }) {
  const toast = useToast()
  const today = todayLocal()
  const [date, setDate] = useState(today)
  const [reasonKind, setReasonKind] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [by, setBy] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const recent = useAsyncResource(
    () => listNoClass(addDays(today, -60), today, accessToken),
    [accessToken],
    { enabled: !!accessToken },
  )

  async function mark() {
    setError('')
    if (!date) { setError('Select the date'); return }
    if (!by)   { setError('Select who is marking this'); return }
    if (!reasonKind) { setError('Select the reason'); return }
    const reason = reasonKind === OTHER ? otherReason.trim() : FACULTY_CANCELLATION
    if (!reason) { setError('Enter the reason for no class'); return }
    setSaving(true)
    try {
      await markNoClass({ date, reason, markedByName: by }, accessToken)
      toast.success('Marked as No Class', `${fmtDay(date)} is recorded as a day with no class.`)
      setReasonKind('')
      setOtherReason('')
      recent.refetch()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not mark No Class')
    } finally { setSaving(false) }
  }

  async function undo(id: string) {
    try {
      await removeNoClass(id, accessToken)
      recent.refetch()
    } catch (e: unknown) {
      toast.error('Could not undo', e instanceof Error ? e.message : undefined)
    }
  }

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>No Class</h3>
      <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: 0 }}>
        If no class was held at your campus on a day, mark it here. Otherwise the day shows as
        &ldquo;report not submitted&rdquo; for HR.
      </p>

      {error && (
        <div className="alert alert-warning" role="alert" style={{ marginBottom: '1rem' }}>
          <span className="alert-icon" aria-hidden="true">!</span>{error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="input-group">
          <FormField label="Date" htmlFor="nc-date" required>
            <input id="nc-date" type="date" className="input" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Marked by" htmlFor="nc-by" required>
            <select id="nc-by" className="input" value={by} onChange={(e) => setBy(e.target.value)}>
              <option value="">— select —</option>
              {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Reason" htmlFor="nc-reason" required>
          <select id="nc-reason" className="input" value={reasonKind} onChange={(e) => setReasonKind(e.target.value)}>
            <option value="">— select —</option>
            <option value={FACULTY_CANCELLATION}>{FACULTY_CANCELLATION}</option>
            <option value={OTHER}>Other</option>
          </select>
        </FormField>
        {reasonKind === OTHER && (
          <FormField label="Enter the reason" htmlFor="nc-other" required hint="e.g. holiday, exam day">
            <input id="nc-other" className="input" value={otherReason} maxLength={120} autoFocus onChange={(e) => setOtherReason(e.target.value)} />
          </FormField>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={mark} disabled={saving}>
            {saving ? <><span className="spinner spinner-on-solid" /> Saving…</> : 'Mark as No Class'}
          </button>
        </div>
      </div>

      {recent.status === 'error' && (
        <div style={{ marginTop: '1rem' }}>
          <ErrorAlert message={recent.error?.message ?? ''} what="Couldn't load your No Class days" onRetry={recent.refetch} />
        </div>
      )}
      {(recent.data?.length ?? 0) > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '1.25rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {recent.data!.map((n) => (
            <li key={n._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
              <span>
                <strong>{fmtDay(toLocalISO(new Date(n.date)))}</strong>
                {n.reason && <span style={{ color: 'var(--color-muted)' }}> — {n.reason}</span>}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => undo(n._id)}>Undo</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
