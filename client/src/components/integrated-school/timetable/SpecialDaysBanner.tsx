import { SpecialDay, SPECIAL_TYPE_BADGE } from './types'

interface SpecialDaysBannerProps {
  specialDays: SpecialDay[]
  canDelete: boolean
  onDelete: (id: string) => void
}

export function SpecialDaysBanner({ specialDays, canDelete, onDelete }: SpecialDaysBannerProps) {
  if (specialDays.length === 0) return null

  return (
    <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {specialDays.map((sd) => (
        <div key={sd._id} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '0.5rem', padding: '0.5rem 0.875rem',
        }}>
          <span className={`badge ${SPECIAL_TYPE_BADGE[sd.type] ?? 'badge-gray'}`}>{sd.type.replace(/_/g, ' ')}</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
            {typeof sd.campusId === 'object' && sd.campusId ? sd.campusId.name : 'All IG Campuses'}
            {sd.notes ? ` — ${sd.notes}` : ''}
          </span>
          {canDelete && (
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', lineHeight: 1 }}
              onClick={() => onDelete(sd._id)}>×</button>
          )}
        </div>
      ))}
    </div>
  )
}
