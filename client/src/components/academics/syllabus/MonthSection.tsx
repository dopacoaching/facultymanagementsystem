import { SUBJECTS, SUBJECT_LABEL } from './types'
import type { MonthData, Subject } from './types'
import s from './Syllabus.module.css'

interface MonthSectionProps {
  monthData: MonthData
}

const SWATCH: Record<Subject, string> = {
  PHYSICS: s.physics,
  CHEMISTRY: s.chemistry,
  BIOLOGY: s.biology,
}

export function MonthSection({ monthData: md }: MonthSectionProps) {
  const total = SUBJECTS.reduce((n, subj) => n + (md.subjects[subj]?.length ?? 0), 0)

  return (
    <section className="card" aria-label={md.monthName}>
      <div className={`card-header ${s.monthHead}`}>
        <h2>{md.monthName}</h2>
        <span className={`${s.monthCount} num`}>{total} chapters</span>
      </div>

      <div className={s.subjects}>
        {SUBJECTS.map((subj) => {
          const chapters = md.subjects[subj]
          if (!chapters || chapters.length === 0) return null
          return (
            <div key={subj} className={s.subject}>
              <div className={s.subjectHead}>
                <span className={`${s.swatch} ${SWATCH[subj]}`} aria-hidden="true" />
                {SUBJECT_LABEL[subj]}
                <span className={s.count}>{chapters.length}</span>
              </div>
              <ol className={s.list}>
                {chapters.map((ch) => (
                  <li key={ch._id} className={s.item}>
                    <span className={s.order}>{ch.chapterOrder}.</span>
                    <span className={ch.isSplitPart ? s.split : undefined}>
                      {ch.chapterName}
                      {ch.isSplitPart && <span className={`badge badge-gray ${s.splitTag}`}>split</span>}
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
