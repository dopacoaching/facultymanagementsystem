import Link from 'next/link'
import type { ISChapter } from './types'

interface ChapterProgressCardProps {
  chapters: ISChapter[]
}

export function ChapterProgressCard({ chapters }: ChapterProgressCardProps) {
  if (chapters.length === 0) return null

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div className="card-header">
        <h2>Chapter Progress</h2>
        <Link href="/ig/chapters" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          View all →
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[...new Set(chapters.map((c) => c.subject))].sort().map((subj) => {
          const subChapters = chapters.filter((c) => c.subject === subj)
          if (!subChapters.length) return null
          const done = subChapters.filter((c) => c.status === 'COMPLETED').length
          const pct  = Math.round((done / subChapters.length) * 100)
          return (
            <div key={subj}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>
                <span style={{ fontWeight: 600 }}>{subj.charAt(0) + subj.slice(1).toLowerCase()}</span>
                <span style={{ color: 'var(--color-muted)' }}>{done}/{subChapters.length}</span>
              </div>
              <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-success)', borderRadius: 99, transition: 'width 0.3s' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
