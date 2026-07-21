export interface ReportRow {
  facultyId: string
  name: string
  subject: string
  month: number
  year: number
  finalPayable: number
  status: string
  approvedAt: string
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function exportToCSV(rows: ReportRow[], month: number, year: number) {
  if (!rows.length) return
  const headers = ['Faculty', 'Subject', 'Period', 'Final Payable (₹)', 'Status', 'Approved At']
  const csvRows = rows.map((r) => [
    `"${r.name}"`,
    `"${r.subject}"`,
    `"${MONTHS[r.month - 1]} ${r.year}"`,
    r.finalPayable ?? 0,
    r.status,
    `"${new Date(r.approvedAt).toLocaleString('en-IN')}"`,
  ])
  // Total row
  const total = rows.reduce((sum, r) => sum + (r.finalPayable ?? 0), 0)
  csvRows.push([`"Total Payroll — ${MONTHS[month - 1]} ${year}"`, '', '', total, '', ''])

  const csv = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `salary-report-${MONTHS[month - 1].toLowerCase()}-${year}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
