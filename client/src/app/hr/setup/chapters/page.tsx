'use client'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useToast } from '@/components/ui/Toast'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { Icon } from '@/components/ui/Icon'
import rs from '@/components/hr/reports/Reports.module.css'
import { addChapterOptions, getChapterOptions, removeChapterOption, type SetupChapter } from '@/services/setup.service'
import { SUBJECT_OPTIONS } from '@/components/coordinator/log-session'

export default function ChaptersSetupPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0].value)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const res = useAsyncResource<SetupChapter[]>(
    () => getChapterOptions(subject, accessToken!),
    [accessToken, subject],
    { enabled: !!accessToken },
  )
  const chapters = res.data ?? []
  const subjectLabel = SUBJECT_OPTIONS.find((s) => s.value === subject)?.label ?? subject

  // One chapter per line, so a whole list can be pasted at once.
  const pending = text.split('\n').map((l) => l.trim()).filter(Boolean)

  async function add() {
    if (!accessToken) return
    if (pending.length === 0) { setError('Type at least one chapter name'); return }
    setSaving(true); setError('')
    try {
      const r = await addChapterOptions(subject, pending, accessToken)
      toast.success(
        r.added === 1 ? 'Chapter added' : `${r.added} chapters added`,
        r.skipped ? `${r.skipped} already on the list, skipped.` : subjectLabel,
      )
      setText('')
      res.refetch()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not add the chapters')
    } finally { setSaving(false) }
  }

  async function remove(c: SetupChapter) {
    if (!accessToken) return
    if (!window.confirm(`Remove "${c.name}" from ${subjectLabel}? Past entries keep their chapter.`)) return
    try {
      await removeChapterOption(c._id, accessToken)
      toast.success('Chapter removed', c.name)
      res.refetch()
    } catch (e: unknown) {
      toast.error('Could not remove', e instanceof Error ? e.message : undefined)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Chapters</h1>
          <p className="page-subtitle">Add chapters for any subject. They appear in the Push Board chapter list, next to the syllabus chapters.</p>
        </div>
      </div>

      <div className="panel-grid-2">
        <section className="card" aria-label="Add chapters">
          <div className="card-header"><h2>Add chapters</h2></div>
          <div className="form-stack">
            {error && <ErrorAlert message={error} onDismiss={() => setError('')} />}
            <FormField label="Subject" htmlFor="ch-subject">
              <select id="ch-subject" className="input" value={subject} onChange={(e) => { setSubject(e.target.value); setError('') }}>
                {SUBJECT_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </FormField>
            <FormField label="Chapters to add" htmlFor="ch-names" hint="One chapter per line — paste a whole list if you have one">
              <textarea
                id="ch-names"
                className="input"
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'e.g.\nIntroduction to Psychology\nMethods of Enquiry'}
                style={{ resize: 'vertical' }}
              />
            </FormField>
            <div>
              <button type="button" className="btn btn-primary" onClick={add} disabled={saving || pending.length === 0}>
                {saving
                  ? <><span className="spinner spinner-on-solid" /> Adding…</>
                  : <><Icon name="plus" size={16} /> {pending.length > 1 ? `Add ${pending.length} chapters` : 'Add chapter'}</>}
              </button>
            </div>
          </div>
        </section>

        <section className="card card-flush" aria-label={`Chapters added for ${subjectLabel}`}>
          <div className="card-header">
            <h2>Added for {subjectLabel}</h2>
            {res.status === 'success' && <span className="badge badge-gray"><span className="mono">{chapters.length}</span> added</span>}
          </div>
          {res.status === 'error' ? (
            <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <ErrorAlert message={res.error?.message ?? ''} what="Couldn't load the chapters" onRetry={res.refetch} />
            </div>
          ) : res.status === 'loading' ? (
            <SkeletonTable rows={4} cols={2} />
          ) : chapters.length === 0 ? (
            <EmptyState title="No chapters added" description={`Chapters you add for ${subjectLabel} will show here.`} />
          ) : (
            <div className="table-wrapper table-stack" style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}>
              <table>
                <thead><tr><th>Chapter</th><th style={{ textAlign: 'right' }}><span className={rs.srOnly}>Actions</span></th></tr></thead>
                <tbody>
                  {chapters.map((c) => (
                    <tr key={c._id}>
                      <td data-label="Chapter" className={rs.strong}>{c.name}</td>
                      <td>
                        <div className={rs.rowActions}>
                          <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => remove(c)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
