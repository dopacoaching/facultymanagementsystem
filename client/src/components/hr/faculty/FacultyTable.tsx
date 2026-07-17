import type { Faculty } from '@/types'
import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'

interface FacultyTableProps {
  loading: boolean
  filtered: Faculty[]
  search: string
  onAdd: () => void
  onEdit: (f: Faculty) => void
  onConfigurePay: (f: Faculty) => void
}

export function FacultyTable({ loading, filtered, search, onAdd, onEdit, onConfigurePay }: FacultyTableProps) {
  if (loading) return <SkeletonTable rows={5} cols={6} />

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title={search ? 'No results found' : 'No faculty added yet'}
        description={search ? `No faculty match "${search}". Try a different search term.` : 'Add your first faculty member to get started with payroll and scheduling.'}
        action={search ? undefined : { label: '+ Add Faculty', onClick: onAdd }}
      />
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Subject</th>
            <th>Type</th>
            <th>Salary Model</th>
            <th>Status</th>
            <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((f) => (
            <tr key={f._id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                    {f.name.charAt(0)}
                  </div>
                  <span style={{ fontWeight: 600 }}>{f.name}</span>
                </div>
              </td>
              <td style={{ color: 'var(--color-text-secondary)' }}>{f.subject}</td>
              <td><span className="badge badge-gray">{f.type}</span></td>
              <td>
                <span className={`badge ${f.salaryModel === 'CONFIGURABLE' ? 'badge-yellow' : 'badge-indigo'}`}>
                  {f.salaryModel.replace(/_/g, ' ')}
                </span>
              </td>
              <td>
                <span className={`badge ${f.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {f.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                  {f.salaryModel === 'CONFIGURABLE' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onConfigurePay(f)}
                      style={{ fontSize: '0.75rem' }}
                      title="Configure pay JSON for CONFIGURABLE salary model"
                    >
                      ⚙️ Configure Pay
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => onEdit(f)}>Edit</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
