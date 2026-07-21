import { useRef, useState } from 'react'
import type { ChapterRow } from './types'

interface VideoCellProps {
  row: ChapterRow
  canEdit: boolean
  saving: boolean
  onSave: (watched: number) => void
}

export function VideoCell({ row, canEdit, saving, onSave }: VideoCellProps) {
  const total = row.totalVideos ?? 0
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(String(row.videosWatched))
  const inputRef              = useRef<HTMLInputElement>(null)

  // No videos for this chapter — show static badge
  if (total === 0) {
    return (
      <td style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>no videos</span>
      </td>
    )
  }

  const pct      = Math.round((row.videosWatched / total) * 100)
  const complete = row.videoComplete

  if (!editing) {
    return (
      <td style={{ textAlign: 'center', minWidth: 120 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 80, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: complete ? 'var(--color-success)' : 'var(--color-primary)',
              borderRadius: 3, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: complete ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
              {row.videosWatched}/{total}
            </span>
            {row.videoReshooting && (
              <span title="Videos being reshot" style={{ fontSize: '0.65rem', background: 'var(--color-warning)', color: '#fff', borderRadius: 3, padding: '0 4px' }}>
                reshooting
              </span>
            )}
            {canEdit && !saving && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.7rem', padding: '1px 6px', lineHeight: 1.4 }}
                onClick={() => { setVal(String(row.videosWatched)); setEditing(true); setTimeout(() => inputRef.current?.select(), 0) }}
              >
                edit
              </button>
            )}
          </div>
        </div>
      </td>
    )
  }

  return (
    <td style={{ textAlign: 'center', minWidth: 120 }}>
      <form
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        onSubmit={(e) => { e.preventDefault(); const n = Math.max(0, Math.min(total, Number(val))); onSave(n); setEditing(false) }}
      >
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={total}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
          style={{ width: 48, padding: '2px 4px', fontSize: '0.8rem', textAlign: 'center', border: '1px solid var(--color-border)', borderRadius: 4 }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>/{total}</span>
        <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>✓</button>
        <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 6px' }} onClick={() => setEditing(false)}>✕</button>
      </form>
    </td>
  )
}
