import React, { useState } from 'react'
import type { Customer } from '../types'

interface Props {
  customer: Customer
}

function AffinityBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: 'var(--text)', textTransform: 'capitalize' }}>
          {label.replace(/_/g, ' ')}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--border)' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${pct}%`,
          background: `hsl(${200 + pct * 0.6}, 70%, 55%)`,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

function Section({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).slice(0, 4)
  if (entries.length === 0) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 8,
      }}>
        {title}
      </div>
      {entries.map(([k, v]) => <AffinityBar key={k} label={k} value={v} />)}
    </div>
  )
}

export default function CustomerProfile({ customer }: Props) {
  const [open, setOpen] = useState(false)

  const systemLabel = customer.metric_ratio >= 0.60
    ? `Mostly metric (${Math.round(customer.metric_ratio * 100)}%)`
    : customer.metric_ratio <= 0.40
    ? `Mostly imperial (${Math.round((1 - customer.metric_ratio) * 100)}%)`
    : 'Mixed metric/imperial'

  return (
    <div style={{
      marginTop: 10,
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {customer.customer_name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {customer.total_orders} orders · {systemLabel}
            {customer.sparse && ' · sparse history'}
          </div>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          {open ? 'hide profile ▲' : 'view preferences ▼'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 12 }}>
            {customer.sparse && (
              <div style={{
                fontSize: 12, color: '#eab308',
                background: 'rgba(234,179,8,0.1)',
                padding: '6px 10px', borderRadius: 4, marginBottom: 12,
              }}>
                Sparse history — personalization disabled (fewer than 3 orders)
              </div>
            )}
            <Section title="Material preferences" data={customer.material_affinity} />
            <Section title="Finish preferences"   data={customer.finish_affinity} />
            <Section title="Product families"     data={customer.family_affinity} />
          </div>
        </div>
      )}
    </div>
  )
}
