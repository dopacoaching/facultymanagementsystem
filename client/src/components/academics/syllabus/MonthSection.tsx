import { SUBJECTS, SUBJECT_LABEL, SUBJECT_COLOR } from './types'
import type { MonthData } from './types'

interface MonthSectionProps {
  monthData: MonthData
}

export function MonthSection({ monthData: md }: MonthSectionProps) {
  return (
    <section>
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
        {md.monthName}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {SUBJECTS.map((subj) => {
          const chapters = md.subjects[subj]
          if (!chapters || chapters.length === 0) return null
          return (
            <div
              key={subj}
              className={`rounded-xl border-2 p-3 ${SUBJECT_COLOR[subj]}`}
            >
              <div className="text-xs font-bold uppercase tracking-wide mb-2">
                {SUBJECT_LABEL[subj]}
                <span className="ml-2 font-normal opacity-70">({chapters.length})</span>
              </div>
              <ol className="space-y-1">
                {chapters.map((ch) => (
                  <li key={ch._id} className="flex items-start gap-1 text-sm">
                    <span className="opacity-50 shrink-0 w-4 text-right">{ch.chapterOrder}.</span>
                    <span className={ch.isSplitPart ? 'italic' : ''}>
                      {ch.chapterName}
                      {ch.isSplitPart && (
                        <span className="ml-1 text-xs opacity-60">(split)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>
    </section>
  )
}
