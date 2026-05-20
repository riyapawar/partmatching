import React, { useState } from 'react'
import type { Customer } from '../types'

interface Props {
  customer: Customer
}

function AffinityBar({ label, value, index }: { label: string; value: number; index: number }) {
  const pct = Math.round(value * 100)
  const hue  = 160 + index * 22   // walk from emerald → cyan → blue
  const color = `hsl(${hue}, 70%, 55%)`
  const glow  = `hsla(${hue}, 70%, 55%, 0.35)`

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontSize: 12, color: 'var(--text)',
          textTransform: 'capitalize', fontWeight: 500,
        }}>
          {label.replace(/_/g, ' ')}
        </span>
        <span style={{
          fontSize: 11, color,
          fontFamily: 'var(--mono)', fontWeight: 700,
        }}>
          {pct}%
        </span>
      </div>

      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${pct}%`,
          background: `linear-gradient(90deg, hsl(${hue},70%,45%), ${color})`,
          boxShadow: `0 0 6px ${glow}`,
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

function Section({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).slice(0, 5)
  if (entries.length === 0) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 10, fontWeight: 600,
      }}>
        {title}
      </div>
      {entries.map(([k, v], i) => (
        <AffinityBar key={k} label={k} value={v} index={i} />
      ))}
    </div>
  )
}

export default function CustomerProfile({ customer }: Props) {
  const [open, setOpen] = useState(false)

  const systemLabel =
    customer.metric_ratio >= 0.60 ? `Mostly metric (${Math.round(customer.metric_ratio * 100)}%)`
    : customer.metric_ratio <= 0.40 ? `Mostly imperial (${Math.round((1 - customer.metric_ratio) * 100)}%)`
    : 'Mixed metric/imperial'

  return (
    <div style={{
      marginTop: 10,
      background: 'rgba(0,0,0,0.25)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 16px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {customer.customer_name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {customer.total_orders} orders · {systemLabel}
            {customer.sparse && (
              <span style={{
                marginLeft: 8, color: '#f59e0b', fontSize: 10,
                background: 'rgba(245,158,11,0.1)', padding: '1px 6px',
                borderRadius: 3, border: '1px solid rgba(245,158,11,0.2)',
              }}>
                sparse
              </span>
            )}
          </div>
        </div>
        <span style={{
          color: open ? '#10b981' : 'var(--muted)',
          fontSize: 11, fontWeight: 500,
          transition: 'color 0.15s',
        }}>
          {open ? 'hide ▲' : 'view preferences ▼'}
        </span>
      </button>

      {open && (
        <div className="slide-down" style={{
          padding: '4px 16px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {customer.sparse && (
            <div style={{
              fontSize: 12, color: '#f59e0b',
              background: 'rgba(245,158,11,0.08)',
              padding: '8px 12px', borderRadius: 6, margin: '12px 0',
              border: '1px solid rgba(245,158,11,0.2)',
            }}>
              Sparse history — personalization is disabled (fewer than 3 orders)
            </div>
          )}

          <div style={{ paddingTop: 12 }}>
            {/* Metric/imperial indicator */}
            <div style={{ marginBottom: 18 }}>
              <div style={{
                fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase',
                letterSpacing: '0.1em', marginBottom: 10, fontWeight: 600,
              }}>
                Unit system
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 52 }}>Metric</span>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${Math.round(customer.metric_ratio * 100)}%`,
                    background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                    borderRadius: 3,
                    boxShadow: '0 0 6px rgba(16,185,129,0.4)',
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 52, textAlign: 'right' }}>Imperial</span>
              </div>
            </div>

            <Section title="Material preferences" data={customer.material_affinity} />
            <Section title="Finish preferences"   data={customer.finish_affinity} />
            <Section title="Product families"     data={customer.family_affinity} />
          </div>
        </div>
      )}
    </div>
  )
}
