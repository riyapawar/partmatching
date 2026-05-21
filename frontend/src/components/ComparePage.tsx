import React, { useState } from 'react'
import type { Customer, SearchResponse, QueryDebug } from '../types'
import CustomerSelector from './CustomerSelector'

interface Props {
  customers: Customer[]
  dark: boolean
}

const SAMPLE_QUERIES = [
  'M8 flat washer stainless',
  '5/16 hex bolt zinc',
  'lock washer 3/8',
  'brass hex nut 1/2-13',
  'BHCS M6 x 20',
  'the same washers as last time',
  'SHCS 7/16 x 2-1/2',
  'M12 button socket alloy',
]

const ATTR_KEYS: Array<{ key: keyof QueryDebug; label: string }> = [
  { key: 'family',   label: 'Family'   },
  { key: 'diameter', label: 'Thread'   },
  { key: 'length',   label: 'Length'   },
  { key: 'material', label: 'Material' },
  { key: 'finish',   label: 'Finish'   },
  { key: 'system',   label: 'System'   },
]

function ConfBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: color, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function ResultRow({ r, rank, accent }: { r: any; rank: number; accent: string }) {
  const pct = Math.round(r.confidence * 100)
  return (
    <div style={{
      borderLeft: `3px solid ${accent}`,
      paddingLeft: 14, paddingTop: 10, paddingBottom: 10,
      paddingRight: 12, borderRadius: '0 8px 8px 0',
      background: `${accent}08`, marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>RANK {rank}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: accent, fontFamily: 'var(--mono)' }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 11, color: accent, fontFamily: 'var(--mono)', marginBottom: 3, fontWeight: 600 }}>{r.sku}</div>
      <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>{r.description}</div>
      <ConfBar pct={pct} color={accent} />
      {r.personalization_fills?.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>
          ◌ {r.personalization_fills[0]}
        </div>
      )}
    </div>
  )
}

function Verdict({ rA, rB, nameA, nameB, dark }: {
  rA: SearchResponse; rB: SearchResponse
  nameA: string; nameB: string; dark: boolean
}) {
  const bd    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  const bg    = dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.85)'
  const top1A = rA.results[0]
  const top1B = rB.results[0]
  if (!top1A || !top1B) return null

  const sameSku = top1A.sku === top1B.sku
  const deltaRaw = top1A.confidence - top1B.confidence
  const deltaAbs = Math.abs(deltaRaw)
  const winner   = deltaRaw > 0.01 ? nameA : deltaRaw < -0.01 ? nameB : null

  return (
    <div style={{ padding: '18px 22px', borderRadius: 12, background: bg, border: `1px solid ${bd}`, marginBottom: 20 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
        TAKEAWAY
      </div>
      {sameSku ? (
        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.75 }}>
          Both customers received the same top match —{' '}
          <span style={{ color: '#10b981', fontFamily: 'var(--mono)', fontWeight: 600 }}>{top1A.sku}</span>
          {deltaAbs > 0.02 ? (
            ` — but with different confidence levels (${Math.round(top1A.confidence * 100)}% vs ${Math.round(top1B.confidence * 100)}%). Purchase history is shifting the score, not the result.`
          ) : (
            '. Personalization has no diverging effect on this query.'
          )}
        </p>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.75 }}>
          The two customers got <span style={{ color: '#f59e0b', fontWeight: 600 }}>different top results</span>.{' '}
          {winner
            ? `${winner}'s order history pushed a stronger match (+${Math.round(deltaAbs * 100)}pp). `
            : 'Neither profile produced a clearly stronger match. '}
          {nameA} got{' '}
          <span style={{ fontFamily: 'var(--mono)', color: '#10b981', fontWeight: 600 }}>{top1A.sku}</span>
          {' '}while {nameB} got{' '}
          <span style={{ fontFamily: 'var(--mono)', color: '#a78bfa', fontWeight: 600 }}>{top1B.sku}</span>.
        </p>
      )}

      {/* Attribute comparison table */}
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '4px 8px', alignItems: 'center' }}>
        <div style={{ fontSize: 9, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right', paddingBottom: 4 }}>{nameA}</div>
        <div />
        <div style={{ fontSize: 9, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 4 }}>{nameB}</div>
        {ATTR_KEYS.map(({ key, label }) => {
          const vA = rA.query_debug[key] as string | undefined
          const vB = rB.query_debug[key] as string | undefined
          const same = (vA ?? null) === (vB ?? null)
          return (
            <React.Fragment key={label}>
              <div style={{
                textAlign: 'right', fontSize: 11, fontFamily: 'var(--mono)',
                color: vA ? 'var(--text)' : 'var(--muted)',
                padding: '5px 10px', borderRadius: '6px 0 0 6px',
                background: `rgba(16,185,129,${vA ? '0.06' : '0.02'})`,
              }}>{vA ?? '—'}</div>
              <div style={{
                textAlign: 'center', fontSize: 9, color: 'var(--muted)',
                fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                padding: '5px 2px',
                borderTop: `1px solid ${bd}`, borderBottom: `1px solid ${bd}`,
              }}>
                <span style={{ color: same ? '#10b981' : '#f59e0b' }}>{same ? '=' : '≠'}</span>
                {' '}{label}
              </div>
              <div style={{
                fontSize: 11, fontFamily: 'var(--mono)',
                color: vB ? 'var(--text)' : 'var(--muted)',
                padding: '5px 10px', borderRadius: '0 6px 6px 0',
                background: `rgba(167,139,250,${vB ? '0.06' : '0.02'})`,
              }}>{vB ?? '—'}</div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default function ComparePage({ customers, dark }: Props) {
  const [custA, setCustA] = useState<string | null>(null)
  const [custB, setCustB] = useState<string | null>(null)
  const [query, setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [respA, setRespA]   = useState<SearchResponse | null>(null)
  const [respB, setRespB]   = useState<SearchResponse | null>(null)
  const [error, setError]   = useState<string | null>(null)

  const nameA = customers.find(c => c.customer_id === custA)?.customer_name ?? 'Customer A'
  const nameB = customers.find(c => c.customer_id === custB)?.customer_name ?? 'Customer B'

  const bd       = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const panelBg  = dark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.88)'

  async function compare(q?: string) {
    const sq = q ?? query
    if (!sq.trim()) return
    if (q) setQuery(q)
    setLoading(true); setError(null); setRespA(null); setRespB(null)
    try {
      const body = (cid: string | null) => JSON.stringify({ query: sq, customer_id: cid })
      const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      const [rA, rB] = await Promise.all([
        fetch('/api/search', { ...opts, body: body(custA) }).then(r => r.json()),
        fetch('/api/search', { ...opts, body: body(custB) }).then(r => r.json()),
      ])
      setRespA(rA); setRespB(rB)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const hasResults = !!(respA && respB && !loading)

  return (
    <div className="fade-in">

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#a78bfa', background: 'rgba(167,139,250,0.07)',
          border: '1px solid rgba(167,139,250,0.2)', padding: '5px 14px', borderRadius: 20, marginBottom: 12,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
          PRIORS COMPARISON
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 540 }}>
          Pick two customers and run the same query. See how purchase history shifts results — same catalog, different context.
        </p>
      </div>

      {/* Customer selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ background: panelBg, border: `2px solid rgba(16,185,129,0.25)`, borderRadius: 12, padding: '14px 16px', boxShadow: dark ? 'none' : '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 9, color: '#10b981', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>CUSTOMER A</div>
          <CustomerSelector customers={customers} selected={custA} onSelect={setCustA} disabled={loading} />
        </div>

        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: dark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.25)',
          fontSize: 12, fontWeight: 900, color: '#f59e0b',
          letterSpacing: '-0.02em',
          boxShadow: '0 0 16px rgba(245,158,11,0.15)',
        }}>VS</div>

        <div style={{ background: panelBg, border: `2px solid rgba(167,139,250,0.25)`, borderRadius: 12, padding: '14px 16px', boxShadow: dark ? 'none' : '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 9, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>CUSTOMER B</div>
          <CustomerSelector customers={customers} selected={custB} onSelect={setCustB} disabled={loading} />
        </div>
      </div>

      {/* Sample prompts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {SAMPLE_QUERIES.map(sq => (
          <button key={sq} onClick={() => compare(sq)} disabled={loading}
            style={{
              padding: '4px 12px', fontSize: 11, borderRadius: 20,
              background: query === sq ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${query === sq ? 'rgba(167,139,250,0.35)' : bd}`,
              color: query === sq ? '#a78bfa' : 'var(--muted)',
              fontFamily: 'var(--mono)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (query !== sq) { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'; e.currentTarget.style.color = '#a78bfa' } }}
            onMouseLeave={e => { if (query !== sq) { e.currentTarget.style.borderColor = bd; e.currentTarget.style.color = 'var(--muted)' } }}
          >{sq}</button>
        ))}
      </div>

      {/* Query input */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 24,
        background: dark ? 'rgba(11,17,35,0.82)' : 'rgba(255,255,255,0.97)',
        border: `1px solid ${bd}`, borderRadius: 10,
        padding: '6px 6px 6px 16px',
        boxShadow: dark ? 'none' : '0 2px 16px rgba(0,0,0,0.07)',
      }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && compare()}
          placeholder='Type a part query or click a sample above…'
          disabled={loading}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--mono)' }}
        />
        <button
          onClick={() => compare()}
          disabled={loading || !query.trim()}
          style={{
            padding: '9px 22px', borderRadius: 8, border: 'none',
            background: loading || !query.trim() ? 'rgba(167,139,250,0.08)' : 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            color: loading || !query.trim() ? 'var(--muted)' : '#fff',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', whiteSpace: 'nowrap',
            boxShadow: loading || !query.trim() ? 'none' : '0 0 14px rgba(167,139,250,0.35)',
            transition: 'all 0.2s',
          }}
        >{loading ? 'COMPARING…' : 'COMPARE →'}</button>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
        </div>
      )}

      {/* Results + analysis */}
      {hasResults && (
        <div className="fade-in">

          {/* Verdict + attribute diff */}
          <Verdict rA={respA!} rB={respB!} nameA={nameA} nameB={nameB} dark={dark} />

          {/* Side-by-side result lists */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* A */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{nameA}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>{respA!.search_time_ms}ms</span>
              </div>
              {respA!.results.length === 0
                ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12, background: panelBg, border: `1px solid ${bd}`, borderRadius: 10 }}>No matches</div>
                : respA!.results.map((r, i) => <ResultRow key={r.sku + i} r={r} rank={i + 1} accent="#10b981" />)
              }
            </div>

            {/* B */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{nameB}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>{respB!.search_time_ms}ms</span>
              </div>
              {respB!.results.length === 0
                ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12, background: panelBg, border: `1px solid ${bd}`, borderRadius: 10 }}>No matches</div>
                : respB!.results.map((r, i) => <ResultRow key={r.sku + i} r={r} rank={i + 1} accent="#a78bfa" />)
              }
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
