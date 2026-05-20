import React, { useEffect, useState } from 'react'
import type { Customer, SearchResponse, QueryDebug } from './types'
import CustomerSelector from './components/CustomerSelector'
import CustomerProfile from './components/CustomerProfile'
import ResultCard from './components/ResultCard'

const EXAMPLE_QUERIES = [
  'SHCS 7/16 x 2-1/2',
  'M8 flat washer',
  '5/16 hex nut',
  'lock washer 5/8',
  'M12 x 50mm button socket',
  '1/2 rod 6 foot',
  'HHB 3/4-10 x 5/8',
  'the same washers as last time',
  'M8 x 50mm BHCS alloy black oxide',
  'brass hex nut 1/2-13',
]

// ── Conflict banner ───────────────────────────────────────────────────────────

function ConflictBanner({ conflicts }: { conflicts: string[] }) {
  if (!conflicts.length) return null
  return (
    <div style={{
      padding: '12px 16px', marginBottom: 16,
      background: 'rgba(245,158,11,0.07)',
      border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 10,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        color: '#f59e0b', marginBottom: 8, textTransform: 'uppercase',
      }}>
        ⚠ Preference conflict detected
      </div>
      {conflicts.map((c, i) => (
        <div key={i} style={{ fontSize: 13, color: '#fde68a', marginTop: i > 0 ? 5 : 0 }}>
          {c}
        </div>
      ))}
    </div>
  )
}

// ── Parsed spec tree ─────────────────────────────────────────────────────────

// All 8 possible attributes — always shown, populated or not
const ALL_SPEC_FIELDS: Array<{ key: keyof QueryDebug; label: string }> = [
  { key: 'family',       label: 'FAMILY'   },
  { key: 'system',       label: 'SYSTEM'   },
  { key: 'diameter',     label: 'DIAMETER' },
  { key: 'thread_pitch', label: 'PITCH'    },
  { key: 'length',       label: 'LENGTH'   },
  { key: 'material',     label: 'MATERIAL' },
  { key: 'finish',       label: 'FINISH'   },
  { key: 'negatives',    label: 'EXCLUDES' },
]

function SpecCell({ label, value }: { label: string; value: string | null }) {
  const hasValue = value !== null
  return (
    <div style={{
      padding: '8px 12px',
      background: hasValue ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.15)',
      border: `1px solid ${hasValue ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)'}`,
      borderRadius: 7,
    }}>
      <div style={{
        fontSize: 9, color: hasValue ? '#10b981' : '#2a3a4a',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        fontWeight: 700, marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 500,
        color: hasValue ? 'var(--text)' : '#2a3a4a',
      }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

function DiagnosticsPanel({ debug, ms }: { debug: QueryDebug; ms: number }) {
  const [open, setOpen] = useState(false)

  const filledCount = ALL_SPEC_FIELDS.filter(({ key }) => {
    const v = debug[key]
    return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  }).length

  const specificity = debug.specificity ?? 0
  const pct = Math.round(specificity * 100)
  const specColor = pct >= 60 ? '#10b981' : pct >= 30 ? '#06b6d4' : '#f59e0b'

  return (
    <div style={{
      marginTop: 24,
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 16px',
          background: 'none', border: 'none',
          color: 'var(--muted)', fontSize: 12, textAlign: 'left', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#06b6d4', fontFamily: 'var(--mono)', fontSize: 11 }}>{'{ }'}</span>
          <span>Parsed specification</span>
          <span style={{
            fontSize: 10, color: filledCount > 0 ? '#10b981' : 'var(--muted)',
            fontFamily: 'var(--mono)',
            background: filledCount > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
            padding: '1px 7px', borderRadius: 10,
            border: `1px solid ${filledCount > 0 ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`,
          }}>
            {filledCount}/{ALL_SPEC_FIELDS.length}
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>{ms}ms</span>
        </span>
        <span style={{ color: open ? '#10b981' : 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="slide-down" style={{ padding: '4px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Specificity gauge */}
          <div style={{ marginBottom: 14, paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                Query specificity
              </span>
              <span style={{ fontSize: 11, color: specColor, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                {pct}%
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{
                height: '100%', borderRadius: 2, width: `${pct}%`,
                background: `linear-gradient(90deg, ${specColor}99, ${specColor})`,
                boxShadow: `0 0 6px ${specColor}55`,
                transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
              {pct >= 60 ? 'High — structured scoring dominates'
                : pct >= 30 ? 'Medium — blend of structured + semantic'
                : 'Low — semantic similarity drives results'}
            </div>
          </div>

          {/* Full 8-slot attribute grid — always all 8 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {ALL_SPEC_FIELDS.map(({ key, label }) => {
              const raw = debug[key]
              const isEmpty = raw === null || raw === undefined || raw === '' ||
                              (Array.isArray(raw) && raw.length === 0)
              const value = isEmpty ? null
                : Array.isArray(raw) ? raw.join(', ')
                : String(raw)
              return <SpecCell key={key} label={label} value={value} />
            })}
          </div>

          {debug.note && (
            <div style={{
              marginTop: 10, fontSize: 12, color: '#a78bfa',
              fontStyle: 'italic', padding: '6px 10px',
              background: 'rgba(167,139,250,0.07)',
              borderRadius: 6, border: '1px solid rgba(167,139,250,0.15)',
            }}>
              {debug.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ referential, hasCustomer }: { referential: boolean; hasCustomer: boolean }) {
  const isReferentialNoCustomer = referential && !hasCustomer

  return (
    <div style={{
      padding: 40, textAlign: 'center',
      background: 'rgba(0,0,0,0.2)',
      border: `1px solid ${isReferentialNoCustomer ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>
        {isReferentialNoCustomer ? '◌' : '⊘'}
      </div>
      {isReferentialNoCustomer ? (
        <>
          <div style={{ fontSize: 15, color: '#a78bfa', marginBottom: 8, fontWeight: 500 }}>
            Select a customer to resolve this query
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
            "The same as last time" queries look up your order history —<br />
            choose a customer from the dropdown above to continue.
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 15, color: 'var(--text)', marginBottom: 8, fontWeight: 500 }}>
            No matches found
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
            Try including a part type, size, or material —<br />
            e.g.{' '}
            <span style={{ color: '#10b981', fontFamily: 'var(--mono)' }}>"M8 hex nut"</span>,{' '}
            <span style={{ color: '#10b981', fontFamily: 'var(--mono)' }}>"3/8-16 SHCS zinc"</span>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [customers, setCustomers]   = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [query, setQuery]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [response, setResponse]     = useState<SearchResponse | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const selectedCustomer = customers.find(c => c.customer_id === customerId) ?? null

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(setCustomers)
      .catch(() => setError('Could not reach API. Is the backend running?'))
  }, [])

  async function handleSearch(q?: string) {
    const searchQuery = q ?? query
    if (!searchQuery.trim()) return
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const res = await fetch('/api/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: searchQuery, customer_id: customerId }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail ?? `HTTP ${res.status}`)
      }
      setResponse(await res.json())
    } catch (e: any) {
      setError(e.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function handleExample(eq: string) {
    setQuery(eq)
    handleSearch(eq)
  }

  async function flagForReview() {
    if (!response) return
    await fetch('/api/review', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query, customer_id: customerId, results: response.results, reason: 'manual' }),
    })
    alert('Flagged for review.')
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 20px 100px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 0 28px rgba(16,185,129,0.5), 0 0 8px rgba(6,182,212,0.25)',
          }}>
            ⚙
          </div>
          <div>
            <h1 style={{
              fontSize: 28, fontWeight: 700,
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 55%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.03em', lineHeight: 1.1,
            }}>
              Paragon Part Match
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, letterSpacing: '0.02em' }}>
              Intelligent fastener catalog search · 955 active SKUs
            </p>
          </div>
        </div>
      </div>

      {/* Search panel */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder='e.g. "SHCS 3/8-16 x 1" or "M8 flat washer zinc"'
            disabled={loading}
            style={{
              flex: 1, padding: '13px 16px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, color: 'var(--text)', fontSize: 15, outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e  => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
            onBlur={e   => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            style={{
              padding: '13px 26px', borderRadius: 10, border: 'none',
              background: loading || !query.trim()
                ? 'rgba(16,185,129,0.15)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: loading || !query.trim() ? 'var(--muted)' : '#fff',
              fontSize: 14, fontWeight: 600,
              boxShadow: loading || !query.trim() ? 'none' : '0 0 16px rgba(16,185,129,0.35)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        <CustomerSelector
          customers={customers}
          selected={customerId}
          onSelect={setCustomerId}
          disabled={loading}
        />

        {selectedCustomer && <CustomerProfile customer={selectedCustomer} />}
      </div>

      {/* Example queries */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontSize: 10, color: 'var(--muted)', marginBottom: 8,
          textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
        }}>
          Example queries
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXAMPLE_QUERIES.map(eq => (
            <button
              key={eq}
              onClick={() => handleExample(eq)}
              disabled={loading}
              style={{
                padding: '5px 12px', fontSize: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, color: 'var(--muted)',
                transition: 'all 0.15s',
                fontFamily: 'var(--mono)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'
                e.currentTarget.style.color = '#10b981'
                e.currentTarget.style.background = 'rgba(16,185,129,0.07)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = 'var(--muted)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              }}
            >
              {eq}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: 16,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, color: '#ef4444', fontSize: 14, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* Skeleton loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{
              height: 150, borderRadius: 12,
              opacity: 1 - (i - 1) * 0.25,
            }} />
          ))}
        </div>
      )}

      {/* Results */}
      {response && !loading && (
        <div className="fade-in">

          {response.referential && (
            <div style={{
              padding: '8px 14px', marginBottom: 14,
              background: 'rgba(167,139,250,0.08)',
              border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: 8, fontSize: 13, color: '#a78bfa',
            }}>
              ◌ Resolved from your order history
            </div>
          )}

          <ConflictBanner conflicts={response.conflicts} />

          {response.results.length === 0 ? (
            <EmptyState referential={response.referential} hasCustomer={!!customerId} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {response.results.map((r, i) => (
                <ResultCard key={r.sku + i} result={r} rank={i + 1} />
              ))}
            </div>
          )}

          {/* Flag for review */}
          {response.results.length > 0 && (
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={flagForReview}
                style={{
                  fontSize: 11, color: 'var(--muted)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '5px 14px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'
                  e.currentTarget.style.color = '#f59e0b'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.color = 'var(--muted)'
                }}
              >
                ⚑ Flag for human review
              </button>
            </div>
          )}

          <DiagnosticsPanel debug={response.query_debug} ms={response.search_time_ms} />
        </div>
      )}
    </div>
  )
}
