import type { Batch } from '@/services/faculty.service'
import { MONTHS, Report } from './types'

interface ReportSelectorProps {
  report: Report
  onReportChange: (r: Report) => void
  batches: Batch[]
  batchId: string
  onBatchChange: (id: string) => void
  actMonth: number
  onMonthChange: (m: number) => void
  actYear: number
  onYearChange: (y: number) => void
}

export function ReportSelector({
  report, onReportChange, batches, batchId, onBatchChange,
  actMonth, onMonthChange, actYear, onYearChange,
}: ReportSelectorProps) {
  return (
    <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Report</label>
          <select className="input" value={report} onChange={(e) => onReportChange(e.target.value as Report)} style={{ minWidth: 230 }}>
            <option value="chapters">Chapter Completion Status</option>
            <option value="pending-video">Pending Video Chapters</option>
            <option value="faculty-activity">Monthly Faculty Activity</option>
          </select>
        </div>
        <div>
          <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Batch</label>
          <select className="input" value={batchId} onChange={(e) => onBatchChange(e.target.value)} style={{ minWidth: 200 }}>
            {report === 'faculty-activity' && <option value="">All Batches</option>}
            {batches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.type})</option>)}
          </select>
        </div>
        {report === 'faculty-activity' && (
          <>
            <div>
              <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Month</label>
              <select className="input" value={actMonth} onChange={(e) => onMonthChange(+e.target.value)} style={{ minWidth: 100 }}>
                {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Year</label>
              <input type="number" className="input" value={actYear} min={2020} max={2099} onChange={(e) => onYearChange(+e.target.value)} style={{ width: 90 }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
