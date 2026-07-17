import Link from 'next/link'
import type { Faculty } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'

interface FacultyListCardProps {
  faculty: Faculty[]
  onAdd: () => void
}

export function FacultyListCard({ faculty, onAdd }: FacultyListCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Faculty</h2>
        <Link href="/hr/faculty" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          View all →
        </Link>
      </div>
      {faculty.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No faculty added yet"
          description="Add the first faculty member to get started."
          action={{ label: 'Add Faculty', onClick: onAdd }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {faculty.slice(0, 7).map((f) => (
            <div key={f._id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.625rem 0.5rem', borderRadius: '0.5rem', transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {f.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{f.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{f.subject}</div>
                </div>
              </div>
              <span className={`badge ${f.isActive ? 'badge-green' : 'badge-gray'}`}>
                {f.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
