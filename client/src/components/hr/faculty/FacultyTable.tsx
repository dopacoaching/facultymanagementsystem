import type { Faculty } from '@/types'
import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { Icon } from '@/components/ui/Icon'
import s from './Faculty.module.css'

interface FacultyTableProps {
  loading: boolean
  filtered: Faculty[]
  search: string
  onAdd: () => void
  onEdit: (f: Faculty) => void
  onConfigurePay: (f: Faculty) => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0)
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
}

export function FacultyTable({ loading, filtered, search, onAdd, onEdit, onConfigurePay }: FacultyTableProps) {
  if (loading) return <SkeletonTable rows={5} cols={6} />

  if (filtered.length === 0) {
    return (
      <EmptyState
        title={search ? 'No results found' : 'No faculty added yet'}
        description={search ? `No faculty match "${search}". Try a different search term.` : 'Add your first faculty member to get started with payroll and session tracking.'}
        action={search ? undefined : { label: '+ Add Faculty', onClick: onAdd }}
      />
    )
  }

  return (
    <div className="table-wrapper table-stack">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Subject</th>
            <th>Contract</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((f) => (
            <tr key={f._id} className={`${s.row} ${f.isActive ? '' : s.rowInactive}`}>
              <td data-label="Name">
                <div className={s.nameCell}>
                  <span className={`avatar ${s.avatar}`} aria-hidden="true">{initials(f.name)}</span>
                  <span className={s.nameStack}>
                    <span className={s.nameText}>{f.name}</span>
                    {f.phone && <a className={s.phoneLink} href={`tel:${f.phone.replace(/[^\d+]/g, '')}`}>{f.phone}</a>}
                  </span>
                </div>
              </td>
              <td data-label="Subject" className={s.subjectCell}>{f.subject}</td>
              <td data-label="Contract">
                <div className={s.contract}>
                  <span className="badge badge-gray badge-sentence">{f.type}</span>
                  <span className={`badge badge-sentence ${f.salaryModel === 'CONFIGURABLE' ? 'badge-yellow' : 'badge-indigo'}`}>
                    {f.salaryModel.replace(/_/g, ' ')}
                  </span>
                </div>
              </td>
              <td data-label="Status">
                <span className={`badge badge-dot ${f.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {f.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td data-label="Actions">
                <div className={s.actions}>
                  {f.salaryModel === 'CONFIGURABLE' && (
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm ${s.rowAction}`}
                      onClick={() => onConfigurePay(f)}
                      title="Configure pay JSON for CONFIGURABLE salary model"
                    >
                      Configure Pay
                    </button>
                  )}
                  <button type="button" className={`btn btn-outline btn-sm ${s.rowAction}`} onClick={() => onEdit(f)} aria-label={`Edit ${f.name}`}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
