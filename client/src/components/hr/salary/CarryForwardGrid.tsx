import type { SalaryCarryForward } from '@/types'

interface CarryForwardGridProps {
  carryForward: SalaryCarryForward
}

export function CarryForwardGrid({ carryForward }: CarryForwardGridProps) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p className="section-label">Hour Carry-Forward</p>
      <div className="carry-grid">
        {[
          { label: 'Prev Month Balance',  value: `${carryForward.previousMonthBalance.toFixed(1)} hrs`, bg: '#fff7ed', border: '#fed7aa', color: '#b45309' },
          { label: 'This Month Balance',  value: `${carryForward.currentMonthBalance.toFixed(1)} hrs`,  bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
          { label: 'Combined Total',       value: `${carryForward.combinedTotal.toFixed(1)} hrs`,        bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
        ].map(({ label, value, bg, border, color }) => (
          <div key={label} style={{
            padding: '0.875rem 1rem',
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 'var(--radius)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.375rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontWeight: 800, fontSize: '1.125rem', color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
