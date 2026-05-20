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
  not_in_catalog: '–',
  missing:        '–',
  violated:       '✗',
}

const STATUS_COLOR: Record<string, string> = {
  exact:          '#22c55e',
  compatible:     '#4f8ef7',
  mismatch:       '#ef4444',
  not_in_catalog: '#7a7f9a',
  missing:        '#7a7f9a',
  violated:       '#ef4444',
}

function BreakdownRow({ item }: { item: BreakdownItem }) {
  const icon  = STATUS_ICON[item.status]  ?? '?'
  const color = STATUS_COLOR[item.status] ?? '#7a7f9a'
  const label = item.attribute.replace(/_/g, ' ')
  const pts   = item.points > 0 ? `+${item.points}` : item.points < 0 ? `${item.points}` : ''

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13 }}>
      <span style={{ color, width: 14, flexShrink: 0, fontWeight: 700 }}>{icon}</span>
      <span style={{ color: '#7a7f9a', width: 90, flexShrink: 0, textTransform: 'capitalize' }}>{label}</span>
      <span style={{ flex: 1, color: 'var(--text)' }}>{item.value || '—'}</span>
      {pts && (
        <span style={{ color, fontSize: 11, fontWeight: 600 }}>{pts}pts</span>
      )}
    </div>
  )
}

export default function ResultCard({ result, rank }: Props) {
  const [open, setOpen] = useState(false)
  const hasBreakdown = result.breakdown.length > 0
  const hasFills     = result.personalization_fills.length > 0

  const retrievalBadge = [...new Set(result.retrieval_tags)].join(' + ') || 'history'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 20,
      position: 'relative',
    }}>
      {/* Rank badge */}
      <div style={{
        position: 'absolute', top: -1, left: 20,
        background: 'var(--accent)',
        color: '#fff', fontSize: 11, fontWeight: 700,
        padding: '2px 10px', borderRadius: '0 0 6px 6px',
        letterSpacing: '0.05em',
      }}>
        #{rank}
      </div>

      <ConfidenceBar confidence={result.confidence} label={result.confidence_label} />

      {/* Description */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {result.description}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>
          {result.sku}
        </div>
      </div>

      {/* Reason (from LLM) */}
      {result.reason && (
        <div style={{
          fontSize: 13, color: '#a0a8c0',
          borderLeft: '2px solid var(--accent)',
          paddingLeft: 10, margin: '10px 0',
          fontStyle: 'italic',
        }}>
          {result.reason}
        </div>
      )}

      {/* Personalization fills */}
      {hasFills && (
        <div style={{ margin: '8px 0' }}>
          {result.personalization_fills.map((fill, i) => (
            <div key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: '#a78bfa',
              background: 'rgba(167,139,250,0.1)',
              padding: '3px 8px', borderRadius: 4,
              margin: '2px 4px 2px 0',
            }}>
              ◌ {fill}
            </div>
          ))}
        </div>
      )}

      {/* Footer: retrieval tag + toggle */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)',
      }}>
        <span style={{
          fontSize: 11, color: 'var(--muted)',
          background: 'var(--bg)', padding: '2px 8px', borderRadius: 4,
          border: '1px solid var(--border)',
        }}>
          via {retrievalBadge}
        </span>

        {hasBreakdown && (
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              fontSize: 12, color: 'var(--accent)',
              background: 'none', border: 'none', padding: 0,
            }}
          >
            {open ? 'hide breakdown ↑' : 'show breakdown ↓'}
          </button>
        )}
      </div>

      {/* Attribute breakdown panel */}
      {open && hasBreakdown && (
        <div style={{
          marginTop: 12, padding: 12,
          background: 'var(--bg)',
          borderRadius: 6, border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Attribute Breakdown
          </div>
          {result.breakdown.map((bd, i) => (
            <BreakdownRow key={i} item={bd} />
          ))}
          <div style={{
            marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
            fontSize: 12, color: 'var(--muted)',
          }}>
            Semantic similarity: {Math.round(result.semantic_sim * 100)}%
          </div>
        </div>
      )}
    </div>
  )
}
