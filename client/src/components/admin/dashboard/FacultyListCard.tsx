import Link from 'next/link'
import type { Faculty } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'
import s from './Dashboard.module.css'

interface FacultyListCardProps {
  faculty: Faculty[]
  onAdd: () => void
}

export function FacultyListCard({ faculty, onAdd }: FacultyListCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Faculty</h2>
        <Link href="/hr/faculty" className={s.viewAll}>View all &rarr;</Link>
      </div>
      {faculty.length === 0 ? (
        <EmptyState
          iconName="users"
          title="No faculty added yet"
          description="Add the first faculty member to get started."
          action={{ label: 'Add Faculty', onClick: onAdd }}
        />
      ) : (
        <ul className={s.list}>
          {faculty.slice(0, 7).map((f) => (
            <li key={f._id} className={s.row}>
              <div className={s.rowMain}>
                <span className="avatar" aria-hidden="true">{f.name.charAt(0)}</span>
                <div className={s.rowText}>
                  <div className={s.rowTitle}>{f.name}</div>
                  <div className={s.rowSub}>{f.subject}</div>
                </div>
              </div>
              <span className={`badge badge-dot ${f.isActive ? 'badge-green' : 'badge-gray'}`}>
                {f.isActive ? 'Active' : 'Inactive'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
