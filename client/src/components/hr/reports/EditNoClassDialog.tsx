'use client'
import { useId, useState } from 'react'
import { updateNoClass, type NoClassRow } from '@/services/entries.service'
import { Modal } from '@/components/ui/Modal'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { fmtDay } from './reportShared'

interface EditNoClassDialogProps {
  row: Pick<NoClassRow, '_id' | 'campusName' | 'date' | 'reason'>
  accessToken: string
  onClose: () => void
  /** Called after the reason is saved, so the report can reload. */
  onSaved: () => void
}

/** HR/Admin edit of a No Class marker's reason (the server allows only those two roles and writes the audit log). */
export function EditNoClassDialog({ row, accessToken, onClose, onSaved }: EditNoClassDialogProps) {
  const uid = useId()
  const toast = useToast()
  const [reason, setReason] = useState(row.reason ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!reason.trim()) { setError('Enter the reason'); return }
    setSaving(true); setError('')
    try {
      await updateNoClass(row._id, reason.trim(), accessToken)
      toast.success('Reason updated', 'The change has been saved.')
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit No Class reason"
      size="md"
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
        <p className="help-text" style={{ margin: 0 }}>
          {row.campusName} · <span className="mono">{fmtDay(row.date)}</span>
        </p>
        <div className="form-group">
          <label className="label" htmlFor={`${uid}-reason`}>Reason</label>
          <input id={`${uid}-reason`} className="input" autoFocus value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} />
        </div>
      </form>
    </Modal>
  )
}
