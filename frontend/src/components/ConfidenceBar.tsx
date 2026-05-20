import React from 'react'

interface Props {
  confidence: number
  label:      string
}

const LABEL_META: Record<string, { color: string; bg: string; text: string }> = {
  strong:   { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   text: 'STRONG MATCH' },
  likely:   { color: '#4f8ef7', bg: 'rgba(79,142,247,0.15)',  text: 'LIKELY MATCH' },
  possible: { color: '#eab308', bg: 'rgba(234,179,8,0.15)',   text: 'POSSIBLE MATCH' },
  weak:     { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   text: 'WEAK MATCH' },
}

export default function ConfidenceBar({ confidence, label }: Props) {
  const meta = LABEL_META[label] ?? LABEL_META.weak
  const pct  = Math.round(confidence * 100)

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          color: meta.color, background: meta.bg,
          padding: '3px 8px', borderRadius: 4,
        }}>
          {meta.text}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: meta.color }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${pct}%`,
          background: meta.color,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}
