interface ChaptersStatsBarProps {
  totalCount: number
  videoCount: number
  classCount: number
  pendingVideo: number
}

export function ChaptersStatsBar({ totalCount, videoCount, classCount, pendingVideo }: ChaptersStatsBarProps) {
  if (totalCount === 0) return null

  const stats = [
    { label: 'Total Chapters', value: totalCount,   color: 'var(--color-text-secondary)' },
    { label: 'Videos Complete', value: videoCount,  color: 'var(--color-success)' },
    { label: 'Class Done',      value: classCount,  color: 'var(--color-primary)' },
    { label: 'Videos Pending',  value: pendingVideo, color: 'var(--color-warning)' },
  ]

  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      {stats.map(({ label, value, color }) => (
        <div key={label} className="card" style={{ flex: '1 1 140px', padding: '0.875rem 1.125rem', textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{label}</div>
        </div>
      ))}
    </div>
  )
}
