import React, { useEffect, useRef, useState } from 'react'
import type { Customer } from '../types'

interface Props {
  customers:  Customer[]
  selected:   string | null
  onSelect:   (id: string | null) => void
  disabled:   boolean
}

export default function CustomerSelector({ customers, selected, onSelect, disabled }: Props) {
  const [open,   setOpen]   = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selectedCustomer = customers.find(c => c.customer_id === selected)

  const filtered = customers.filter(c =>
    c.customer_name.toLowerCase().includes(filter.toLowerCase()) ||
    c.customer_id.toLowerCase().includes(filter.toLowerCase())
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 260 }}>
      <button
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 16px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', color: selectedCustomer ? 'var(--text)' : 'var(--muted)',
          fontSize: 14, textAlign: 'left', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span>
          {selectedCustomer
            ? `${selectedCustomer.customer_name} (${selectedCustomer.customer_id})`
            : 'Select customer (optional)'}
        </span>
        <span style={{ color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', marginTop: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ padding: 8 }}>
            <input
              autoFocus
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search customers…"
              style={{
                width: '100%', padding: '8px 10px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text)', fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {selected && (
            <div
              onClick={() => { onSelect(null); setOpen(false); setFilter('') }}
              style={{
                padding: '8px 14px', fontSize: 13, color: 'var(--muted)',
                cursor: 'pointer', borderBottom: '1px solid var(--border)',
              }}
            >
              ✕ No customer (generic search)
            </div>
          )}

          {filtered.map(c => (
            <div
              key={c.customer_id}
              onClick={() => { onSelect(c.customer_id); setOpen(false); setFilter('') }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                background: c.customer_id === selected ? 'rgba(79,142,247,0.12)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background =
                c.customer_id === selected ? 'rgba(79,142,247,0.12)' : 'transparent'
              )}
            >
              <div style={{ fontWeight: 500 }}>{c.customer_name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {c.customer_id} · {c.total_orders} orders
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)' }}>
              No customers found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
