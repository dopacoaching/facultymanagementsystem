import { MONTHS, MONTH_SHORT, STATUS_CONFIG, SUBJECT_LABEL } from './types'
import type { ProgressResponse, Subject } from './types'

interface SubjectProgressSectionProps {
  subject: Subject
  progress: ProgressResponse['progress'][Subject]
}

export function SubjectProgressSection({ subject, progress }: SubjectProgressSectionProps) {
  const monthEntries = MONTHS
    .map((m) => ({ month: m, data: progress[String(m)] }))
    .filter((e) => !!e.data)

  if (monthEntries.length === 0) return null

  const totalPlanned   = monthEntries.reduce((s, e) => s + e.data.chaptersPlanned,   0)
  const totalCompleted = monthEntries.reduce((s, e) => s + e.data.chaptersCompleted, 0)
  const pct = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0

  return (
    <section className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-3">
        <h2 className="font-bold text-gray-700">{SUBJECT_LABEL[subject]}</h2>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{totalCompleted}/{totalPlanned} chapters</span>
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-semibold text-gray-700">{pct}%</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2 w-24">Month</th>
              <th className="text-center px-3 py-2">Planned</th>
              <th className="text-center px-3 py-2">Done</th>
              <th className="text-center px-3 py-2">On Time</th>
              <th className="text-center px-3 py-2">Late</th>
              <th className="text-left px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {monthEntries.map(({ month, data: md }) => {
              const cfg = STATUS_CONFIG[md.status]
              return (
                <tr key={month} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-700">
                    {MONTH_SHORT[month]}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-600">{md.chaptersPlanned}</td>
                  <td className="text-center px-3 py-2.5 text-gray-600">{md.chaptersCompleted}</td>
                  <td className="text-center px-3 py-2.5 text-green-600">{md.chaptersOnTime}</td>
                  <td className="text-center px-3 py-2.5 text-orange-500">{md.chaptersLate}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2.5 py-0.5 ${cfg.cls}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
