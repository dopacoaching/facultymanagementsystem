import Link from 'next/link'
import type { Batch } from '@/services/faculty.service'
import { ChapterSummary } from './types'

interface VideoStatusCardProps {
  chapterSummary: ChapterSummary[]
  batches: Batch[]
  pendingVideoBatches: ChapterSummary[]
}

export function VideoStatusCard({ chapterSummary, batches, pendingVideoBatches }: VideoStatusCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>🎬 Video Status</h2>
        <Link href="/academics/chapters" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          Manage →
        </Link>
      </div>
      {chapterSummary.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
          No chapter data loaded yet. Chapters are seeded when sessions are logged.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {chapterSummary.map((cs) => {
            const batch = batches.find((b) => b._id === cs.batchId)
            if (!batch) return null
            return (
              <div key={cs.batchId} style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', border: cs.pendingVideo > 0 ? '1px solid rgba(245,158,11,.3)' : '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{batch.name}</span>
                  {cs.pendingVideo > 0 ? (
                    <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>
                      {cs.pendingVideo} pending video
                    </span>
                  ) : cs.totalChapters > 0 && cs.videoComplete === cs.totalChapters ? (
                    <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>All videos done</span>
                  ) : cs.videoComplete > 0 ? (
                    <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{cs.videoComplete}/{cs.totalChapters} videos done</span>
                  ) : null}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                  {cs.videoComplete}/{cs.totalChapters} video complete · {cs.facultyClassDone}/{cs.totalChapters} class done
                </div>
              </div>
            )
          })}
          {pendingVideoBatches.length > 0 && (
            <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(245,158,11,.08)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: '#92400e' }}>
              ⚠ {pendingVideoBatches.length} batch{pendingVideoBatches.length !== 1 ? 'es' : ''} have sessions done before video was marked complete.
              This won&apos;t block future sessions but may indicate a workflow gap.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
