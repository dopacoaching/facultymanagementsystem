'use client'
import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import {
  getWeeklyPreview, sendWeeklyReports,
  type WeeklyReportPreview, type WeeklySendResult,
} from '@/services/weeklyReport.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { useToast } from '@/components/ui/Toast'
import { renderReportMessage } from '@/lib/constants/weeklyReportTemplate'
import rs from '@/components/hr/reports/Reports.module.css'
import { toLocalISO } from '@/utils/date'

function lastWeek(): { from: string; to: string } {
  // Previous Monday to Sunday.
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = (today.getDay() + 6) % 7
  const start = new Date(today); start.setDate(today.getDate() - dow - 7)
  const end = new Date(start); end.setDate(start.getDate() + 6)
  return { from: toLocalISO(start), to: toLocalISO(end) }
}

const hm = (hours: number) => {
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60), m = total % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function TemporaryWeeklyPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const init = lastWeek()
  const [from, setFrom] = useState(init.from)
  const [to, setTo] = useState(init.to)
  const [data, setData] = useState<WeeklyReportPreview | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<WeeklySendResult[]>([])

  const load = useCallback(() => {
    if (!accessToken || !from || !to) return
    setLoading(true); setError(''); setResults([])
    getWeeklyPreview(from, to, accessToken)
      .then((d) => { setData(d); setSelected(new Set(d.faculty.filter((f) => f.canSend).map((f) => f.facultyId))) })
      .catch((e: unknown) => { setData(null); setError(e instanceof Error ? e.message : 'Could not load the report') })
      .finally(() => setLoading(false))
  }, [accessToken, from, to])

  useEffect(() => { load() }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendable = data?.faculty.filter((f) => f.canSend) ?? []
  const allSelected = sendable.length > 0 && sendable.every((f) => selected.has(f.facultyId))

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function handleSend() {
    if (!accessToken || !data || selected.size === 0) return
    setSending(true); setError('')
    try {
      const { results } = await sendWeeklyReports({ from, to, facultyIds: Array.from(selected) }, accessToken)
      setResults(results)
      const sent = results.filter((r) => r.status === 'SENT').length
      if (sent === results.length) toast.success('Reports sent', `${sent} sent on WhatsApp.`)
      else toast.error('Some reports were not sent', `${sent} of ${results.length} sent. See the list below.`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sending failed')
    } finally { setSending(false) }
  }

  const resultOf = (id: string) => results.find((r) => r.facultyId === id)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Temporary Faculty Reports</h1>
          <p className="page-subtitle">Send each temporary faculty member their classes and hours for a period, on WhatsApp.</p>
        </div>
      </div>

      <DateRangeFilter
        from={from} to={to} onFromChange={setFrom} onToChange={setTo}
        onApply={load} loading={loading} applyLabel="Show" maxDays={31}
      />

      {error && <div className="mb-4"><ErrorAlert message={error} /></div>}
      {data && !data.configured && (
        <div className="alert alert-warning mb-4" role="status">
          <span className="alert-icon">!</span>
          <div>WhatsApp is not set up on the server yet, so sending is switched off. The preview below still works.</div>
        </div>
      )}

      {loading ? <SkeletonTable rows={5} cols={5} /> : data && (
        data.faculty.length === 0 ? (
          <EmptyState title="No active temporary faculty" description="Add faculty with Employment Type TEMPORARY on the Faculty page." />
        ) : (
          <>
            <div className="table-wrapper table-stack">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox" aria-label="Select all" checked={allSelected} disabled={sendable.length === 0}
                        onChange={() => setSelected(allSelected ? new Set() : new Set(sendable.map((f) => f.facultyId)))}
                      />
                    </th>
                    <th>Faculty</th>
                    <th>Phone</th>
                    <th className="num" style={{ textAlign: 'right' }}>Classes</th>
                    <th className="num" style={{ textAlign: 'right' }}>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.faculty.map((f) => {
                    const r = resultOf(f.facultyId)
                    return (
                      <tr key={f.facultyId}>
                        <td data-label="Select">
                          <input
                            type="checkbox" aria-label={`Select ${f.name}`} disabled={!f.canSend}
                            checked={selected.has(f.facultyId)} onChange={() => toggle(f.facultyId)}
                          />
                        </td>
                        <td data-label="Faculty" className={rs.strong}>{f.name}</td>
                        <td data-label="Phone" className={rs.muted}>{f.phone || '—'}</td>
                        <td data-label="Classes" className="num" style={{ textAlign: 'right' }}>{f.sessionCount}</td>
                        <td data-label="Hours" className="num" style={{ textAlign: 'right' }}>{hm(f.totalHours)}</td>
                        <td data-label="Status">
                          {r ? (
                            <span className={`badge badge-sentence ${r.status === 'SENT' ? 'badge-green' : 'badge-red'}`} title={r.error}>
                              {r.status === 'SENT' ? 'Sent' : r.status === 'SKIPPED' ? 'Skipped' : 'Failed'}{r.error ? `: ${r.error}` : ''}
                            </span>
                          ) : !f.canSend ? (
                            <span className="badge badge-gray badge-sentence">{f.phone ? 'Invalid phone number' : 'No phone number'}</span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {(() => {
              const sample = data.faculty.find((f) => selected.has(f.facultyId)) ?? data.faculty[0]
              const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              const period = from === to ? fmt(from) : `${fmt(from)} to ${fmt(to)}`
              return (
                <div className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
                  <h2 className="section-label">Message preview — {sample.name}</h2>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                    {renderReportMessage([sample.name, period, sample.summary])}
                  </p>
                </div>
              )
            })()}

            <div className="page-head-actions" style={{ marginTop: 'var(--space-4)' }}>
              <button
                type="button" className="btn btn-primary"
                disabled={sending || selected.size === 0 || !data.configured}
                onClick={handleSend}
              >
                {sending ? <><span className="spinner spinner-on-solid" /> Sending…</> : `Send on WhatsApp (${selected.size})`}
              </button>
            </div>
          </>
        )
      )}
    </div>
  )
}
