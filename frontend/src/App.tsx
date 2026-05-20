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

function ConflictBanner({ conflicts }: { conflicts: string[] }) {
  if (!conflicts.length) return null
  return (
    <div style={{
      padding: '10px 14px', marginBottom: 16,
      background: 'rgba(234,179,8,0.08)',
      border: '1px solid rgba(234,179,8,0.35)',
      borderRadius: 8,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        color: '#eab308', marginBottom: 6, textTransform: 'uppercase',
      }}>
        ⚠ Preference conflict detected
      </div>
      {conflicts.map((c, i) => (
        <div key={i} style={{ fontSize: 13, color: '#fde047', marginTop: i > 0 ? 4 : 0 }}>
          {c}
        </div>
      ))}
    </div>
  )
}

function DebugPanel({ debug, ms }: { debug: QueryDebug; ms: number }) {
  const [open, setOpen] = useState(false)
  const attrs = Object.entries(debug).filter(([, v]) =>
    v !== null && v !== undefined && v !== '' &&
    !(Array.isArray(v) && v.length === 0)
  )
  return (
    <div style={{
      marginTop: 24, background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 16px', background: 'none', border: 'none',
          color: 'var(--muted)', fontSize: 12, textAlign: 'left', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between',
        }}
      >
        <span>Query parse · {ms}ms</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '4px 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {attrs.map(([k, v]) => (
            <div key={k} style={{
              fontSize: 12, background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px',
            }}>
              <span style={{ color: 'var(--muted)' }}>{k}: </span>
              <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>
                {Array.isArray(v) ? v.join(', ') : String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
      body:    JSON.stringify({
        query,
        customer_id: customerId,
        results:     response.results,
        reason:      'manual',
      }),
    })
    alert('Flagged for review.')
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>
            ⚙
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Paragon Part Match</h1>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Describe what you're looking for — we'll find the best matches from the catalog.
        </p>
      </div>

      {/* Search area */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder='e.g. "SHCS 3/8-16 x 1" or "M8 flat washer zinc"'
            disabled={loading}
            style={{
              flex: 1, padding: '12px 16px',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 10, color: 'var(--text)', fontSize: 15, outline: 'none',
            }}
            onFocus={e  => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e   => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            style={{
              padding: '12px 24px', borderRadius: 10,
              background: 'var(--accent)', border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 600,
              opacity: loading || !query.trim() ? 0.5 : 1,
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

        {selectedCustomer && (
          <CustomerProfile customer={selectedCustomer} />
        )}
      </div>

      {/* Example queries */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 20, color: 'var(--muted)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
            >
              {eq}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: 16, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
          color: '#ef4444', fontSize: 14, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 140, background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 10,
              opacity: 1 - i * 0.2, animation: 'pulse 1.4s ease-in-out infinite',
            }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:.6}50%{opacity:.3}}`}</style>
        </div>
      )}

      {/* Results */}
      {response && !loading && (
        <>
          {response.referential && (
            <div style={{
              padding: '8px 14px', marginBottom: 12,
              background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: 6, fontSize: 13, color: '#a78bfa',
            }}>
              ◌ Resolved from your order history
            </div>
          )}

          <ConflictBanner conflicts={response.conflicts} />

          {response.results.length === 0 ? (
            <div style={{
              padding: 32, textAlign: 'center', color: 'var(--muted)',
              background: 'var(--surface)', borderRadius: 10,
              border: '1px solid var(--border)',
            }}>
              No matches found. Try a different description.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {response.results.map((r, i) => (
                <ResultCard key={r.sku + i} result={r} rank={i + 1} />
              ))}
            </div>
          )}

          {/* Flag for review button */}
          {response.results.length > 0 && (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button
                onClick={flagForReview}
                style={{
                  fontSize: 12, color: 'var(--muted)',
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                }}
              >
                Flag for human review
              </button>
            </div>
          )}

          <DebugPanel debug={response.query_debug} ms={response.search_time_ms} />
        </>
      )}
    </div>
  )
}
