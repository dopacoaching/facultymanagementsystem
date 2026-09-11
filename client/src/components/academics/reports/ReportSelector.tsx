import type { Batch } from '@/services/faculty.service'
import { Report } from './types'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'

interface ReportSelectorProps {
  report: Report
  onReportChange: (r: Report) => void
  batches: Batch[]
  batchId: string
  onBatchChange: (id: string) => void
  actFrom: string
  onFromChange: (v: string) => void
  actTo: string
  onToChange: (v: string) => void
}

export function ReportSelector({
  report, onReportChange, batches, batchId, onBatchChange,
  actFrom, onFromChange, actTo, onToChange,
}: ReportSelectorProps) {
  return (
    <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Report</label>
          <select className="input" value={report} onChange={(e) => onReportChange(e.target.value as Report)} style={{ minWidth: 230 }}>
            <option value="chapters">Chapter Completion Status</option>
            <option value="pending-video">Pending Video Chapters</option>
            <option value="faculty-activity">Faculty Activity</option>
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
          <DateRangeFilter from={actFrom} to={actTo} onFromChange={onFromChange} onToChange={onToChange} />
        )}
      </div>
    </div>
  )
}
