import { Icon } from '@/components/ui/Icon'
import s from './Syllabus.module.css'

export function SplitChaptersLegend() {
  return (
    <aside className={`card card-quiet ${s.legend}`}>
      <h3 className="cluster"><Icon name="info" size={16} /> Split Chapters</h3>
      <p className="help-text">
        These chapters span two months. Part 2 can only be scheduled after Part 1 is completed.
      </p>
      <ul className={s.legendList}>
        <li><strong>GOC</strong> — Chemistry: Part 1 (August) → Part 2 (September)</li>
        <li><strong>Biotechnology</strong> — Biology: Part 1 (September) → Part 2 (October)</li>
        <li><strong>Genetics</strong> — Biology: Part 1 (September) → Part 2 (October)</li>
      </ul>
    </aside>
  )
}
