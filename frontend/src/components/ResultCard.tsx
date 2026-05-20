import React, { useState } from 'react'
import type { MatchResult, BreakdownItem } from '../types'
import ConfidenceBar from './ConfidenceBar'

interface Props {
  result: MatchResult
  rank:   number
}

const STATUS_ICON: Record<string, string> = {
  exact:          '✓',
  compatible:     '≈',
  mismatch:       '✗',
  not_in_catalog: '—',
  missing:        '—',
  violated:       '✗',
}

const STATUS_COLOR: Record<string, string> = {
  exact:          '#10b981',
  compatible:     '#06b6d4',
  mismatch:       '#ef4444',
  not_in_catalog: '#334155',
  missing:        '#334155',
  violated:       '#ef4444',
}

const STATUS_BG: Record<string, string> = {
  exact:          'rgba(16,185,129,0.08)',
  compatible:     'rgba(6,182,212,0.08)',
  mismatch:       'rgba(239,68,68,0.08)',
  not_in_catalog: 'transparent',
  missing:        'transparent',
  violated:       'rgba(239,68,68,0.08)',
}

// Canonical set of 8 attributes shown on every card
const CANONICAL_ATTRS: Array<{ key: string; label: string }> = [
  { key: 'family',              label: 'family'   },
  { key: 'thread',              label: 'thread'   },
  { key: 'length',              label: 'length'   },
  { key: 'material',            label: 'material' },
  { key: 'finish',              label: 'finish'   },
  { key: 'standard',            label: 'std'      },
  { key: 'negative_constraint', label: 'excl'     },
]

function AttrDot({ status, label, value }: { status: string | null; label: string; value?: string }) {
  const icon  = status ? (STATUS_ICON[status]  ?? '?') : '—'
  const color = status ? (STATUS_COLOR[status] ?? '#334155') : '#2a3a4a'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 36 }}>
      <span style={{
        fontSize: 12, fontWeight: 700, color,
        lineHeight: 1,
      }}>
        {icon}
      </span>
      <span style={{
        fontSize: 9, color: status ? '#556070' : '#2a3a4a',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        fontWeight: 500,
      }}>
        {label}
      </span>
    </div>
  )
}

function BreakdownRow({ item }: { item: BreakdownItem }) {
  const icon  = STATUS_ICON[item.status]  ?? '?'
  const color = STATUS_COLOR[item.status] ?? '#556070'
  const bg    = STATUS_BG[item.status]    ?? 'transparent'
  const label = item.attribute.replace(/_/g, ' ')
  const pts   = item.points > 0 ? `+${item.points}` : item.points < 0 ? `${item.points}` : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 10px', borderRadius: 6, background: bg, marginBottom: 4,
    }}>
      <span style={{ color, width: 16, flexShrink: 0, fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
        {icon}
      </span>
      <span style={{
        color: '#6b7f99', width: 110, flexShrink: 0,
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500,
      }}>
        {label}
      </span>
      <span style={{
        flex: 1, color: 'var(--text)', fontSize: 12,
        fontFamily: 'var(--mono)',
      }}>
        {item.value || '—'}
      </span>
      {pts && (
        <span style={{
          color, fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--mono)',
          padding: '1px 6px', borderRadius: 4,
          background: bg, border: `1px solid ${color}30`,
        }}>
          {pts}
        </span>
      )}
    </div>
  )
}

export default function ResultCard({ result, rank }: Props) {
  const [open, setOpen] = useState(false)

  const hasBreakdown = result.breakdown.length > 0
  const hasFills     = result.personalization_fills.length > 0
  const retrievalBadge = [...new Set(result.retrieval_tags)].join(' + ') || 'history'

  // Build a lookup from attribute key → breakdown item
  const bdMap = Object.fromEntries(result.breakdown.map(b => [b.attribute, b]))

  return (
    <div className="result-card" style={{ padding: '20px 20px 16px', position: 'relative' }}>

      {/* Rank ribbon */}
      <div style={{
        position: 'absolute', top: 0, left: 20,
        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
        color: '#fff', fontSize: 10, fontWeight: 700,
        padding: '3px 12px', borderRadius: '0 0 8px 8px',
        letterSpacing: '0.08em', boxShadow: '0 2px 8px rgba(16,185,129,0.4)',
      }}>
        #{rank}
      </div>

      <ConfidenceBar confidence={result.confidence} label={result.confidence_label} />

      {/* Description + SKU */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6, lineHeight: 1.4,
          fontFamily: "'Space Grotesk', system-ui, sans-serif", letterSpacing: '-0.01em',
        }}>
          {result.description}
        </div>
        <div style={{
          fontSize: 11, color: '#06b6d4', fontFamily: 'var(--mono)',
          background: 'rgba(6,182,212,0.07)',
          display: 'inline-block', padding: '2px 8px', borderRadius: 4,
          border: '1px solid rgba(6,182,212,0.15)',
        }}>
          {result.sku}
        </div>
      </div>

      {/* ── Inline attribute grid (always visible) ── */}
      <div style={{
        display: 'flex', gap: 0,
        padding: '10px 12px', marginBottom: 12,
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)',
        justifyContent: 'space-between',
      }}>
        {CANONICAL_ATTRS.map(({ key, label }) => {
          const bd = bdMap[key]
          return (
            <AttrDot
              key={key}
              label={label}
              status={bd ? bd.status : null}
              value={bd?.value}
            />
          )
        })}
      </div>

      {/* LLM reason */}
      {result.reason && (
        <div style={{
          fontSize: 12, color: '#8899cc',
          borderLeft: '2px solid #10b981',
          paddingLeft: 12, marginBottom: 12,
          fontStyle: 'italic', lineHeight: 1.5,
        }}>
          {result.reason}
        </div>
      )}

      {/* Personalization fills */}
      {hasFills && (
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {result.personalization_fills.map((fill, i) => (
            <div key={i} style={{
              fontSize: 11, color: '#a78bfa',
              background: 'rgba(167,139,250,0.08)',
              padding: '3px 10px', borderRadius: 20,
              border: '1px solid rgba(167,139,250,0.2)',
            }}>
              ◌ {fill}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{
          fontSize: 10, color: 'var(--muted)',
          background: 'rgba(255,255,255,0.03)',
          padding: '3px 8px', borderRadius: 4,
          border: '1px solid var(--border)',
          fontFamily: 'var(--mono)',
        }}>
          via {retrievalBadge}
        </span>

        {hasBreakdown && (
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              fontSize: 11, color: open ? '#10b981' : 'var(--muted)',
              background: open ? 'rgba(16,185,129,0.07)' : 'none',
              border: `1px solid ${open ? 'rgba(16,185,129,0.2)' : 'transparent'}`,
              padding: '3px 10px', borderRadius: 5, transition: 'all 0.15s',
            }}
          >
            {open ? 'hide detail ↑' : 'point breakdown ↓'}
          </button>
        )}
      </div>

      {/* Detailed breakdown panel */}
      {open && hasBreakdown && (
        <div className="slide-down" style={{
          marginTop: 12, padding: 14,
          background: 'rgba(0,0,0,0.25)', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            fontSize: 10, color: 'var(--muted)', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
          }}>
            Score Breakdown
          </div>
          {result.breakdown.map((bd, i) => <BreakdownRow key={i} item={bd} />)}
          <div style={{
            marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)',
          }}>
            <span>Semantic similarity</span>
            <span style={{ fontFamily: 'var(--mono)', color: '#06b6d4' }}>
              {Math.round(result.semantic_sim * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
