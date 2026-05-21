import React, { useState } from 'react'
import type { Customer, SearchResponse, QueryDebug } from '../types'
import CustomerSelector from './CustomerSelector'

interface Props {
  customers: Customer[]
  dark: boolean
}

const ATTR_KEYS: Array<{ key: keyof QueryDebug; label: string }> = [
  { key: 'family',   label: 'family'   },
  { key: 'diameter', label: 'thread'   },
  { key: 'length',   label: 'length'   },
  { key: 'material', label: 'material' },
  { key: 'finish',   label: 'finish'   },
  { key: 'system',   label: 'system'   },
]

function CompactResult({ r, rank, dark }: { r: any; rank: number; dark: boolean }) {
  const pct = Math.round(r.confidence * 100)
  const color = r.confidence_label === 'strong' ? '#10b981'
    : r.confidence_label === 'likely'   ? '#06b6d4'
    : r.confidence_label === 'possible' ? '#f59e0b' : '#ef4444'

  const bd = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10, marginBottom: 6,
      background: dark ? 'rgba(8,15,35,0.9)' : 'rgba(255,255,255,0.95)',
      border: `1px solid ${bd}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>#{rank}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{pct}%</span>
        </div>
      </div>
      <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#06b6d4', marginBottom: 3 }}>{r.sku}</div>
      <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.4 }}>{r.description}</div>
    </div>
  )
}

function DiffPanel({ dA, dB, rA, rB, dark }: { dA: QueryDebug | null; dB: QueryDebug | null; rA: SearchResponse | null; rB: SearchResponse | null; dark: boolean }) {
  const bd = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const bgPanel = dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'

  const top1A = rA?.results?.[0]?.sku
  const top1B = rB?.results?.[0]?.sku
  const sameSku = top1A && top1B && top1A === top1B

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* TOP-1 badge */}
      {(top1A || top1B) && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: bgPanel, border: `1px solid ${bd}`, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>TOP-1</div>
          {sameSku ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>Same SKU</div>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(16,185,129,0.25)' }}>
                {top1A}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>Different</div>
          )}
        </div>
      )}

      {/* Parse slots */}
      {dA && dB && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: bgPanel, border: `1px solid ${bd}` }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>PARSE SLOTS</div>
          {ATTR_KEYS.map(({ key, label }) => {
            const vA = dA[key] as string | undefined
            const vB = dB[key] as string | undefined
            const same = (vA ?? null) === (vB ?? null)
            return (
              <div key={label} style={{
                display: 'grid', gridTemplateColumns: '1fr 14px 1fr',
                alignItems: 'center', gap: 4, marginBottom: 5,
              }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: vA ? 'var(--text)' : 'var(--muted)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vA ?? '—'}</span>
                <span style={{ fontSize: 10, textAlign: 'center', color: same ? '#10b981' : '#f59e0b' }}>{same ? '+' : '≠'}</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: vB ? 'var(--text)' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vB ?? '—'}</span>
              </div>
            )
          })}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${bd}` }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>attr labels</div>
            {ATTR_KEYS.map(({ label }) => (
              <div key={label} style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            ))}
          </div>
        </div>
      )}

      {/* Score delta */}
      {rA && rB && rA.results[0] && rB.results[0] && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: bgPanel, border: `1px solid ${bd}`, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Δ SCORE</div>
          {(() => {
            const delta = Math.round((rA.results[0].confidence - rB.results[0].confidence) * 100)
            const abs = Math.abs(delta)
            const color = abs < 3 ? '#10b981' : abs < 10 ? '#f59e0b' : '#ef4444'
            return (
              <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'var(--mono)' }}>
                {delta > 0 ? `A +${delta}%` : delta < 0 ? `B +${abs}%` : '0%'}
              </span>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default function ComparePage({ customers, dark }: Props) {
  const [custA, setCustA] = useState<string | null>(null)
  const [custB, setCustB] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [respA, setRespA] = useState<SearchResponse | null>(null)
  const [respB, setRespB] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const nameA = customers.find(c => c.customer_id === custA)?.customer_name ?? 'Customer A'
  const nameB = customers.find(c => c.customer_id === custB)?.customer_name ?? 'Customer B'

  async function compare() {
    if (!query.trim()) return
    setLoading(true); setError(null); setRespA(null); setRespB(null)
    try {
      const body = (cid: string | null) => JSON.stringify({ query, customer_id: cid })
      const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      const [rA, rB] = await Promise.all([
        fetch('/api/search', { ...opts, body: body(custA) }).then(r => r.json()),
        fetch('/api/search', { ...opts, body: body(custB) }).then(r => r.json()),
      ])
      setRespA(rA); setRespB(rB)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const bd = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const panelBg = dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.88)'

  return (
    <div className="fade-in">
      {/* Header badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#06b6d4', background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)', padding: '5px 14px', borderRadius: 20, marginBottom: 20 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }} />
        SAME QUERY · DIFFERENT PRIORS
      </div>

      {/* Query row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, display: 'flex', gap: 10, background: dark ? 'rgba(11,17,35,0.82)' : 'rgba(255,255,255,0.97)', border: `1px solid ${bd}`, borderRadius: 10, padding: '6px 6px 6px 14px', boxShadow: dark ? 'none' : '0 2px 10px rgba(0,0,0,0.07)' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && compare()}
            placeholder='e.g. "M8 flat washer" or "SHCS 7/16 x 2-1/2"'
            disabled={loading}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--mono)' }}
          />
          <button onClick={compare} disabled={loading || !query.trim()} style={{
            padding: '9px 20px', borderRadius: 7, border: 'none',
            background: loading || !query.trim() ? 'rgba(6,182,212,0.1)' : 'linear-gradient(135deg, #0891b2, #06b6d4)',
            color: loading || !query.trim() ? '#2a3a4a' : '#fff',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
            boxShadow: loading || !query.trim() ? 'none' : '0 0 14px rgba(6,182,212,0.35)',
          }}>
            {loading ? 'COMPARING…' : 'COMPARE →'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Three-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', gap: 14 }}>

        {/* Customer A */}
        <div>
          <div style={{ background: panelBg, border: `1px solid ${bd}`, borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: dark ? 'none' : '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>A</div>
            <CustomerSelector customers={customers} selected={custA} onSelect={setCustA} disabled={loading} />
          </div>

          {loading && <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />}
          {respA && !loading && (
            <div className="fade-in">
              {respA.results.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: panelBg, border: `1px solid ${bd}`, borderRadius: 10 }}>No matches</div>
              ) : respA.results.map((r, i) => <CompactResult key={r.sku + i} r={r} rank={i + 1} dark={dark} />)}
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 6 }}>{respA.search_time_ms}ms · {nameA}</div>
            </div>
          )}
        </div>

        {/* DIFF */}
        <div style={{ paddingTop: 56 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>DIFF</div>
          <DiffPanel dA={respA?.query_debug ?? null} dB={respB?.query_debug ?? null} rA={respA} rB={respB} dark={dark} />
        </div>

        {/* Customer B */}
        <div>
          <div style={{ background: panelBg, border: `1px solid ${bd}`, borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: dark ? 'none' : '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 10, color: '#06b6d4', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>B</div>
            <CustomerSelector customers={customers} selected={custB} onSelect={setCustB} disabled={loading} />
          </div>

          {loading && <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />}
          {respB && !loading && (
            <div className="fade-in">
              {respB.results.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: panelBg, border: `1px solid ${bd}`, borderRadius: 10 }}>No matches</div>
              ) : respB.results.map((r, i) => <CompactResult key={r.sku + i} r={r} rank={i + 1} dark={dark} />)}
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 6 }}>{respB.search_time_ms}ms · {nameB}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
