'use client'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useToast } from '@/components/ui/Toast'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
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
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Chapters</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Add chapters for any subject. They appear in the Push Board chapter list, next to the syllabus chapters.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 520 }}>
          {error && <ErrorAlert message={error} onDismiss={() => setError('')} />}
          <FormField label="Subject" htmlFor="ch-subject">
            <select id="ch-subject" className="input" value={subject} onChange={(e) => { setSubject(e.target.value); setError('') }}>
              {SUBJECT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FormField>
          <FormField label="Chapters to add" htmlFor="ch-names" hint="One chapter per line — paste a whole list if you have one">
            <textarea
              id="ch-names"
              className="input"
              rows={5}
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
                : pending.length > 1 ? `Add ${pending.length} chapters` : 'Add chapter'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem', margin: '0 0 1rem' }}>Added for {subjectLabel}</h2>
        {res.status === 'error' ? (
          <ErrorAlert message={res.error?.message ?? ''} what="Couldn't load the chapters" onRetry={res.refetch} />
        ) : res.status === 'loading' ? (
          <SkeletonTable rows={4} cols={2} />
        ) : chapters.length === 0 ? (
          <EmptyState title="No chapters added" description={`Chapters you add for ${subjectLabel} will show here.`} />
        ) : (
          <div className="table-wrapper">
            <table style={{ minWidth: 360 }}>
              <thead><tr><th>Chapter</th><th style={{ width: 100, textAlign: 'right' }}></th></tr></thead>
              <tbody>
                {chapters.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => remove(c)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
