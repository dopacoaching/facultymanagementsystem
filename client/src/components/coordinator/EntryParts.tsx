import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import s from './Entry.module.css'

/** One numbered card of an entry form (Class details, Faculty & subject, Time & breaks, ...). */
export function StepCard({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className={`card ${s.step}`} aria-labelledby={`step-${n}-title`}>
      <div className={s.stepHead}>
        <span className={s.stepNum} aria-hidden="true">{n}</span>
        <h2 className={s.stepTitle} id={`step-${n}-title`}>{title}</h2>
      </div>
      <div className={s.stepBody}>{children}</div>
    </section>
  )
}

/** A tickable row (batch, campus). Keeps the checkbox native so keyboard and screen readers work. */
export function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className={`${s.checkRow} ${checked ? s.checkRowOn : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {children}
    </label>
  )
}

/** Read-only calculated hours, shown big and mono so it can be checked at a glance. */
export function HoursReadout({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={s.readout} aria-live="polite">
      <span className={s.readoutLabel}>{label}</span>
      <span className={s.readoutValue}>{value}</span>
      {note && <p className={s.readoutNote}>{note}</p>}
    </div>
  )
}

/** Success panel shown after an entry is saved. */
export function SavedPanel({ title, children, actionLabel, onAction }: {
  title: string
  children?: ReactNode
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className={`card ${s.done}`} role="status">
      <span className={s.doneIcon}><Icon name="check" size={22} /></span>
      <h2 className={s.doneTitle}>{title}</h2>
      {children && <p className={s.doneText}>{children}</p>}
      <button type="button" className="btn btn-primary btn-lg" onClick={onAction}>{actionLabel}</button>
    </div>
  )
}
