import React, { useEffect, useRef, useState } from 'react'
import type { Customer, SearchResponse, QueryDebug, MatchResult } from './types'
import CustomerSelector from './components/CustomerSelector'
import CustomerProfile from './components/CustomerProfile'
import ResultCard from './components/ResultCard'
import DesignPage from './components/DesignPage'

const EXAMPLE_QUERIES = [
  'SHCS 7/16 x 2-1/2', 'M8 flat washer', '5/16 hex nut', 'lock washer 5/8',
  'M12 x 50mm button socket', '1/2 rod 6 foot', 'HHB 3/4-10 x 5/8',
  'the same washers as last time', 'M8 x 50mm BHCS alloy black oxide', 'brass hex nut 1/2-13',
]

// ── Spec tree ─────────────────────────────────────────────────────────────────

const LINE = 'rgba(16,185,129,0.25)'

function SpecBox({ label, value, root }: { label: string; value: string | null; root?: boolean }) {
  const active = value !== null
  return (
    <div style={{
      padding: root ? '6px 14px' : '5px 10px',
      border: `1px solid ${active ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 6,
      background: active ? 'rgba(16,185,129,0.07)' : 'rgba(0,0,0,0.2)',
      textAlign: 'center', minWidth: root ? 120 : 72,
    }}>
      <div style={{ fontSize: 8, color: active ? '#10b981' : '#2a3a4a', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: active ? 'var(--text)' : '#2a3a4a', fontFamily: 'var(--mono)', fontWeight: 500 }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

function Stem({ height = 16, color = LINE }: { height?: number; color?: string }) {
  return <div style={{ width: 1, height, background: color, margin: '0 auto' }} />
}

function HBar({ children, lineColor = LINE }: { children: React.ReactNode; lineColor?: string }) {
  const count = React.Children.count(children)
  return (
    <div style={{ position: 'relative', display: 'flex', gap: 6, justifyContent: 'center' }}>
      {/* Horizontal connector bar */}
      {count > 1 && (
        <div style={{
          position: 'absolute', top: 0, height: 1, background: lineColor,
          left: `calc(100% / ${count * 2})`,
          right: `calc(100% / ${count * 2})`,
        }} />
      )}
      {React.Children.map(children, (child) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 1, height: 12, background: lineColor }} />
          {child}
        </div>
      ))}
    </div>
  )
}

function SpecTree({ debug }: { debug: QueryDebug }) {
  const threadVal = [debug.diameter, debug.thread_pitch ? `p${debug.thread_pitch}` : null].filter(Boolean).join('-') || null
  const filledCount = [debug.family, threadVal, debug.length, debug.material, debug.finish, debug.negatives?.length ? debug.negatives.join(',') : null, debug.system]
    .filter(Boolean).length

  const pills = [
    debug.family    && `${debug.family} → family`,
    debug.diameter  && `${debug.diameter} → thread`,
    debug.length    && `${debug.length} → length`,
    debug.material  && `${debug.material} → material`,
    debug.finish    && `${debug.finish} → finish`,
  ].filter(Boolean) as string[]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Parsed Spec</span>
        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: filledCount > 0 ? '#10b981' : 'var(--muted)' }}>
          {filledCount}/8
        </span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 16 }}>
        family is the hard-filter root · 7 attributes branch off as peers
      </div>

      {/* Tree */}
      <div style={{ userSelect: 'none' }}>
        {/* Root */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SpecBox label="Family" value={debug.family ?? null} root />
        </div>
        <Stem height={16} />

        {/* Level 1: thread, length, material, finish */}
        <HBar>
          <SpecBox label="Thread" value={threadVal} />
          <SpecBox label="Length" value={debug.length ?? null} />
          <SpecBox label="Material" value={debug.material ?? null} />
          <SpecBox label="Finish" value={debug.finish ?? null} />
        </HBar>

        <Stem height={12} />

        {/* Level 2: system, standard, negatives */}
        <HBar>
          <SpecBox label="System" value={debug.system ?? null} />
          <SpecBox label="Standard" value={null} />
          <SpecBox label="Excludes" value={debug.negatives?.length ? debug.negatives.join(', ') : null} />
        </HBar>
      </div>

      {/* Pill tags */}
      {pills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
          {pills.map(p => (
            <span key={p} style={{
              fontSize: 10, fontFamily: 'var(--mono)',
              color: '#10b981', background: 'rgba(16,185,129,0.08)',
              padding: '3px 8px', borderRadius: 4,
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Customer panel (right column) ────────────────────────────────────────────

function CustomerPanel({
  customers, customerId, onSelect, loading, selectedCustomer, dark,
}: {
  customers: Customer[]
  customerId: string | null
  onSelect: (id: string | null) => void
  loading: boolean
  selectedCustomer: Customer | null
  dark: boolean
}) {
  return (
    <div style={{
      background: dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.88)',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'}`,
      boxShadow: dark ? 'none' : '0 2px 10px rgba(0,0,0,0.06)',
      borderRadius: 10, padding: 16, height: '100%',
    }}>
      <CustomerSelector customers={customers} selected={customerId} onSelect={onSelect} disabled={loading} />
      {selectedCustomer
        ? <CustomerProfile customer={selectedCustomer} />
        : (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10, color: 'var(--muted)', opacity: 0.4 }}>◌</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              No customer selected
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.6, marginTop: 4 }}>
              Pick one to personalize results
            </div>
          </div>
        )
      }
    </div>
  )
}

// ── Conflict banner ───────────────────────────────────────────────────────────

function ConflictBanner({ conflicts }: { conflicts: string[] }) {
  if (!conflicts.length) return null
  return (
    <div style={{
      padding: '10px 16px', marginBottom: 14,
      background: 'rgba(245,158,11,0.07)',
      border: '1px solid rgba(245,158,11,0.25)',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', marginBottom: 6, textTransform: 'uppercase' }}>
        ⚠ Preference conflict
      </div>
      {conflicts.map((c, i) => (
        <div key={i} style={{ fontSize: 12, color: '#fde68a', marginTop: i > 0 ? 4 : 0 }}>{c}</div>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ referential, hasCustomer }: { referential: boolean; hasCustomer: boolean }) {
  const isRefNoCustomer = referential && !hasCustomer
  return (
    <div style={{
      padding: 40, textAlign: 'center',
      background: 'rgba(0,0,0,0.2)',
      border: `1px solid ${isRefNoCustomer ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{isRefNoCustomer ? '◌' : '⊘'}</div>
      {isRefNoCustomer ? (
        <>
          <div style={{ fontSize: 14, color: '#a78bfa', marginBottom: 6, fontWeight: 500 }}>Select a customer to resolve this query</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
            "The same as last time" queries look up your order history —<br />choose a customer above to continue.
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6, fontWeight: 500 }}>No matches found</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
            Try including a part type, size, or material —<br />
            e.g. <span style={{ color: '#10b981', fontFamily: 'var(--mono)' }}>"M8 hex nut"</span>,{' '}
            <span style={{ color: '#10b981', fontFamily: 'var(--mono)' }}>"3/8-16 SHCS zinc"</span>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark]             = useState(() => localStorage.getItem('theme') !== 'light')
  const [page, setPage]             = useState<'search' | 'design'>('search')
  const [customers, setCustomers]   = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [query, setQuery]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [response, setResponse]     = useState<SearchResponse | null>(null)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const selectedCustomer = customers.find(c => c.customer_id === customerId) ?? null

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
      .catch(() => setError('Could not reach API. Is the backend running?'))
  }, [])

  async function handleSearch(q?: string) {
    const sq = q ?? query
    if (!sq.trim()) return
    setLoading(true); setError(null); setResponse(null)
    try {
      const res = await fetch('/api/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sq, customer_id: customerId }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail ?? `HTTP ${res.status}`) }
      setResponse(await res.json())
    } catch (e: any) { setError(e.message ?? 'Unknown error') }
    finally { setLoading(false) }
  }

  async function flagForReview() {
    if (!response) return
    await fetch('/api/review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, customer_id: customerId, results: response.results, reason: 'manual' }),
    })
    alert('Flagged for review.')
  }

  const hasResults = response && !loading

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28, paddingBottom: 20,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, boxShadow: '0 0 16px rgba(16,185,129,0.4)',
          }}>⚙</div>
          <span style={{
            fontSize: 15, fontWeight: 700, letterSpacing: '0.04em',
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            color: '#10b981',
          }}>PARAGON</span>
          <span style={{ color: '#2a3a4a', fontSize: 15 }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '0.06em', fontWeight: 500 }}>CATALOG MATCH</span>
        </div>

        {/* Page tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['search', 'design'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '6px 16px', borderRadius: 7,
                background: page === p ? 'rgba(16,185,129,0.1)' : 'none',
                border: `1px solid ${page === p ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.07)'}`,
                color: page === p ? '#10b981' : 'var(--muted)',
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Right side: SKU count + theme toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            955 active SKUs
          </div>
          <button
            onClick={() => setDark(d => !d)}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
              color: dark ? '#f59e0b' : '#6b7a8d',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </div>

      {/* ── Design page ── */}
      {page === 'design' && <DesignPage />}

      {/* ── Search page ── */}
      {page === 'search' && <>

      {/* ── Search bar ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20,
        background: dark ? 'rgba(11,17,35,0.82)' : 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
        boxShadow: dark ? 'none' : '0 2px 16px rgba(0,0,0,0.07)',
        borderRadius: 10, padding: '6px 6px 6px 16px',
      }}>
        <span style={{ color: 'var(--muted)', alignSelf: 'center', fontSize: 15 }}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder='Describe a fastener — e.g. "SHCS 7/16 x 2-1/2" or "M8 flat washer zinc"'
          disabled={loading}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text)', fontSize: 15, fontFamily: 'var(--mono)',
          }}
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          style={{
            padding: '10px 22px', borderRadius: 8, border: 'none',
            background: loading || !query.trim() ? 'rgba(16,185,129,0.1)' : 'linear-gradient(135deg, #10b981, #059669)',
            color: loading || !query.trim() ? '#2a3a4a' : '#fff',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
            boxShadow: loading || !query.trim() ? 'none' : '0 0 14px rgba(16,185,129,0.35)',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'SEARCHING…' : 'SEARCH →'}
        </button>
      </div>

      {/* ── Example queries ── */}
      {!hasResults && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
          {EXAMPLE_QUERIES.map(eq => (
            <button key={eq} onClick={() => { setQuery(eq); handleSearch(eq) }} disabled={loading}
              style={{
                padding: '4px 12px', fontSize: 11, borderRadius: 20,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                color: 'var(--muted)', fontFamily: 'var(--mono)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.color = '#10b981' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--muted)' }}
            >{eq}</button>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Two-column: spec tree | customer ── */}
      {(hasResults || loading) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 20 }}>

          {/* Left: spec panel */}
          <div style={{
            background: dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.88)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'}`,
            boxShadow: dark ? 'none' : '0 2px 10px rgba(0,0,0,0.06)',
            borderRadius: 10, padding: 20,
          }}>
            {loading ? (
              <div className="skeleton" style={{ height: 180, borderRadius: 8 }} />
            ) : response ? (
              <SpecTree debug={response.query_debug} />
            ) : null}
          </div>

          {/* Right: customer */}
          <CustomerPanel
            customers={customers}
            customerId={customerId}
            onSelect={setCustomerId}
            loading={loading}
            selectedCustomer={selectedCustomer}
            dark={dark}
          />
        </div>
      )}

      {/* ── Results ── */}
      {hasResults && (
        <div className="fade-in">
          {response!.referential && (
            <div style={{ padding: '7px 14px', marginBottom: 12, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 7, fontSize: 12, color: '#a78bfa' }}>
              ◌ Resolved from your order history
            </div>
          )}

          <ConflictBanner conflicts={response!.conflicts} />

          {response!.results.length === 0
            ? <EmptyState referential={response!.referential} hasCustomer={!!customerId} />
            : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {response!.results.map((r, i) => (
                    <ResultCard key={r.sku + i} result={r} rank={i + 1} />
                  ))}
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    {response!.search_time_ms}ms
                  </span>
                  <button onClick={flagForReview}
                    style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '4px 12px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
                  >
                    ⚑ Flag for review
                  </button>
                </div>
              </>
            )
          }
        </div>
      )}

      </> /* end search page */}
    </div>
  )
}
