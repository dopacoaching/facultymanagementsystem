'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/faculty.service'
import type { Faculty } from '@/types'
import Link from 'next/link'

export default function HRDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [faculty, setFaculty] = useState<Faculty[]>([])

  useEffect(() => {
    if (!accessToken) return
    getAll(accessToken, true).then(setFaculty).catch(console.error)
  }, [accessToken])

  const active   = faculty.filter((f) => f.isActive).length
  const inactive = faculty.length - active

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Total Faculty', value: faculty.length, icon: '👥', color: 'var(--color-primary)' },
          { label: 'Active',        value: active,         icon: '✅', color: 'var(--color-success)' },
          { label: 'Inactive',      value: inactive,       icon: '⏸',  color: 'var(--color-muted)'   },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ color }}>{value}</div>
              </div>
              <span style={{ fontSize: '1.5rem', opacity: 0.7 }}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Faculty list */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2>Faculty</h2>
          <Link href="/hr/faculty" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            View all →
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {faculty.slice(0, 10).map((f) => (
            <div key={f._id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.625rem 0.5rem',
              borderRadius: '0.5rem',
              transition: 'background 0.1s',
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
          {faculty.length === 0 && (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">👥</div>
              <p>No faculty added yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
