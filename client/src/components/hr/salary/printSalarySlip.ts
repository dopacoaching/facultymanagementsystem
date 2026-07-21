import type { Faculty, SalaryResult } from '@/types'
import { MONTHS_LONG } from './types'

/** Escape special HTML characters to prevent XSS when inserting user data into document.write(). */
function escapeHtml(s: string | number | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function printSalarySlip(faculty: Faculty, month: number, year: number, result: SalaryResult, onError: (msg: string) => void) {
  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
  if (!win) { onError('Popups are blocked — please allow popups for this site to print salary slips.'); return }

  const breakdown = (result.breakdown ?? []).map((row) => `
    <tr class="${row.isDeduction ? 'ded' : ''}">
      <td>${row.isDeduction ? '&minus; ' : ''}${escapeHtml(row.label)}</td>
      <td>${/\bhours?\b|\bhrs\b|\bquota\b/i.test(row.label) ? escapeHtml(row.amount % 1 === 0 ? row.amount : row.amount.toFixed(1)) + ' hrs' : (Number.isInteger(row.amount) || row.amount > 100 ? '&#8377;' + escapeHtml(row.amount.toLocaleString('en-IN')) : escapeHtml(row.amount.toFixed(1)))}</td>
    </tr>`).join('')

  const carryHtml = result.carryForward ? `
    <div class="section-title">Hour Carry-Forward</div>
    <div class="carry">
      <div><div class="clabel">Prev Month Balance</div><div class="cval">${escapeHtml(result.carryForward.previousMonthBalance.toFixed(1))} hrs</div></div>
      <div><div class="clabel">This Month Balance</div><div class="cval">${escapeHtml(result.carryForward.currentMonthBalance.toFixed(1))} hrs</div></div>
      <div><div class="clabel">Combined Total</div><div class="cval">${escapeHtml(result.carryForward.combinedTotal.toFixed(1))} hrs</div></div>
    </div>` : ''

  const alertsHtml = (result.alerts ?? []).filter((a) => a.level !== 'BLOCK').map((a) => `
    <div class="alert-row ${a.level === 'WARNING' ? 'alert-warn' : 'alert-info'}">${escapeHtml(a.message)}</div>`).join('')

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const hoursRow = result.hoursLogged != null ? `<div><div class="flabel">Hours Logged</div><div class="fval">${escapeHtml(result.hoursLogged)} hrs</div></div>` : ''
  const daysRow  = result.daysWorked  != null ? `<div><div class="flabel">Days Worked</div><div class="fval">${escapeHtml(result.daysWorked)} days</div></div>` : ''

  win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Salary Slip &#8212; ${escapeHtml(faculty.name)} &#8212; ${escapeHtml(MONTHS_LONG[month-1])} ${escapeHtml(year)}</title>
<style>
@page{size:A4;margin:18mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;font-size:14px}
.slip{max-width:680px;margin:0 auto;padding:2rem}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #4f46e5;padding-bottom:1.25rem;margin-bottom:1.5rem}
.org{font-size:1.375rem;font-weight:800;color:#4f46e5;letter-spacing:-.02em}
.org-sub{font-size:.75rem;color:#64748b;margin-top:.2rem}
.period-lbl{font-size:.8rem;font-weight:700;color:#64748b;text-align:right}
.period{font-size:1.25rem;font-weight:800;color:#1e293b;text-align:right}
.fbox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:.625rem}
.flabel{font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-weight:600}
.fval{font-size:.9375rem;font-weight:700;color:#1e293b;margin-top:.1rem}
.section-title{font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;font-weight:700;margin:1.5rem 0 .625rem}
table{width:100%;border-collapse:collapse}
td{padding:.45rem .5rem;font-size:.875rem;border-bottom:1px solid #f1f5f9}
td:last-child{text-align:right;font-weight:600}
tr.ded td{color:#dc2626}
.total-row td{border-top:2px solid #4f46e5;padding-top:.75rem;font-size:1rem;font-weight:800;color:#4f46e5;border-bottom:none}
.carry{background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:.75rem 1rem;display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:.5rem}
.clabel{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:#92400e;font-weight:600}
.cval{font-size:.9375rem;font-weight:700;color:#b45309;margin-top:.15rem}
.alerts{display:flex;flex-direction:column;gap:.375rem;margin-top:.5rem}
.alert-row{font-size:.8rem;padding:.375rem .75rem;border-radius:5px;border-left:3px solid}
.alert-info{background:#eff6ff;border-color:#3b82f6;color:#1e40af}
.alert-warn{background:#fffbeb;border-color:#f59e0b;color:#92400e}
.footer{margin-top:3rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:2rem}
.sig{border-top:1px solid #94a3b8;padding-top:.375rem;font-size:.75rem;color:#64748b;text-align:center}
.print-btn{position:fixed;bottom:1.5rem;right:1.5rem;background:#4f46e5;color:#fff;border:none;border-radius:50px;padding:.75rem 1.5rem;font-size:1rem;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(79,70,229,.4)}
@media print{.print-btn{display:none}}
</style></head><body>
<div class="slip">
  <div class="hdr">
    <div><div class="org">DOPA Coaching</div><div class="org-sub">Calicut, Kerala</div></div>
    <div><div class="period-lbl">Salary Slip</div><div class="period">${escapeHtml(MONTHS_LONG[month-1])} ${escapeHtml(year)}</div></div>
  </div>
  <div class="fbox">
    <div><div class="flabel">Faculty Name</div><div class="fval">${escapeHtml(faculty.name)}</div></div>
    <div><div class="flabel">Subject</div><div class="fval">${escapeHtml(faculty.subject) || '&mdash;'}</div></div>
    <div><div class="flabel">Pay Period</div><div class="fval">${escapeHtml(MONTHS_LONG[month-1])} ${escapeHtml(year)}</div></div>
    <div><div class="flabel">Generated On</div><div class="fval">${escapeHtml(today)}</div></div>
    ${hoursRow}${daysRow}
  </div>
  ${alertsHtml ? `<div class="section-title">Notes</div><div class="alerts">${alertsHtml}</div>` : ''}
  ${carryHtml}
  ${breakdown ? `<div class="section-title">Pay Breakdown</div><table><tbody>${breakdown}<tr class="total-row"><td>Net Payable</td><td>&#8377;${escapeHtml(result.finalPayable?.toLocaleString('en-IN') ?? '0')}</td></tr></tbody></table>` : ''}
  <div class="footer">
    <div class="sig">Prepared by HR</div>
    <div class="sig">Faculty Signature</div>
    <div class="sig">Authorised Signatory</div>
  </div>
</div>
<button class="print-btn" onclick="window.print()">🖨 Print</button>
<script>setTimeout(function(){window.print()},600)</script>
</body></html>`)
  win.document.close()
}
