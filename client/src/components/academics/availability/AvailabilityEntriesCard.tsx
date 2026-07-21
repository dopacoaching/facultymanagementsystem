import React from 'react'
import type { AvailabilityEntry, AvailabilityStatus } from '@/services/availability.service'
import { Skeleton, EmptyState } from '@/components/ui/Skeleton'
import { fmtDate, MONTHS, STATUS_STYLE } from './types'

interface AvailabilityEntriesCardProps {
  entries: AvailabilityEntry[]
  loadingEntries: boolean
  month: number
  year: number
  editingId: string | null
  editStatus: AvailabilityStatus
  onEditStatusChange: (s: AvailabilityStatus) => void
  editRemark: string
  onEditRemarkChange: (r: string) => void
  editError: string
  editSaving: boolean
  onStartEdit: (entry: AvailabilityEntry) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: (id: string) => void
}

export function AvailabilityEntriesCard({
  entries, loadingEntries, month, year, editingId, editStatus, onEditStatusChange,
  editRemark, onEditRemarkChange, editError, editSaving, onStartEdit, onCancelEdit, onSaveEdit, onDelete,
}: AvailabilityEntriesCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Availability — {MONTHS[month - 1]} {year}</h2>
        {entries.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['AVAILABLE', 'RESCHEDULED', 'CANCELLED'] as AvailabilityStatus[]).map((s) => {
              const count = entries.filter((e) => e.status === s).length
              if (!count) return null
              return (
                <span key={s} className={`badge ${STATUS_STYLE[s].badge}`} style={{ fontSize: '0.7rem' }}>
                  {count} {STATUS_STYLE[s].label.toLowerCase()}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {loadingEntries ? (
        <div style={{ padding: '0.5rem' }}>
          {[1,2,3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.8rem 0', borderBottom: '1px solid var(--color-border)' }}>
              <Skeleton height="0.875rem" width="35%" />
              <Skeleton height="1.25rem" width={80} />
              <Skeleton height="0.875rem" width="25%" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No availability entered yet"
          description="Add dates using the form above to track this faculty member's availability."
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Remark</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <React.Fragment key={entry._id}>
                  <tr>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(entry.date)}</td>
                    <td>
                      <span className={`badge ${STATUS_STYLE[entry.status].badge}`}>
                        {STATUS_STYLE[entry.status].label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', maxWidth: 240 }}>
                      {entry.remark ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          background: 'var(--color-surface-2)',
                          borderRadius: 'var(--radius-sm)',
                          fontStyle: 'italic',
                        }}>
                          &quot;{entry.remark}&quot;
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onStartEdit(entry)}
                        style={{ marginRight: '0.375rem', fontSize: '0.75rem' }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onDelete(entry._id)}
                        style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>

                  {editingId === entry._id && (
                    <tr key={`${entry._id}-edit`} style={{ background: 'var(--color-surface-2)' }}>
                      <td colSpan={4} style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
                            <label className="label" style={{ fontSize: '0.75rem' }}>Status</label>
                            <select
                              className="input"
                              value={editStatus}
                              onChange={(e) => onEditStatusChange(e.target.value as AvailabilityStatus)}
                              style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                            >
                              <option value="AVAILABLE">Available</option>
                              <option value="RESCHEDULED">Rescheduled</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ margin: 0, flex: '1 1 220px' }}>
                            <label className="label" style={{ fontSize: '0.75rem' }}>
                              Remark {editStatus !== 'AVAILABLE' && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={editRemark}
                              onChange={(e) => onEditRemarkChange(e.target.value)}
                              placeholder={editStatus === 'RESCHEDULED' ? 'e.g. Moved to 18th June' : editStatus === 'CANCELLED' ? 'e.g. Emergency leave' : 'Optional note'}
                              style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                            />
                          </div>
                          {editError && (
                            <div style={{ width: '100%', color: 'var(--color-danger)', fontSize: '0.8125rem' }}>{editError}</div>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                            <button className="btn btn-primary btn-sm" onClick={onSaveEdit} disabled={editSaving} style={{ fontSize: '0.8125rem' }}>
                              {editSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={onCancelEdit} style={{ fontSize: '0.8125rem' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
