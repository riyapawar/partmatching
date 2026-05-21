import React from 'react'

interface Props {
  confidence: number
  label:      string
}

const LABEL_META: Record<string, {
  badgeText: string
  color:     string
  bg:        string
  glow:      string
  barGrad:   string
  glowClass: string
}> = {
  strong: {
    badgeText: 'STRONG MATCH',
    color:     '#10b981',
    bg:        'rgba(16,185,129,0.12)',
    glow:      'rgba(16,185,129,0.30)',
    barGrad:   'linear-gradient(90deg, #10b981, #34d399)',
    glowClass: 'glow-green',
  },
  likely: {
    badgeText: 'LIKELY MATCH',
    color:     '#06b6d4',
    bg:        'rgba(6,182,212,0.12)',
    glow:      'rgba(6,182,212,0.30)',
    barGrad:   'linear-gradient(90deg, #0891b2, #06b6d4)',
    glowClass: 'glow-cyan',
  },
  possible: {
    badgeText: 'POSSIBLE MATCH',
    color:     '#f59e0b',
    bg:        'rgba(245,158,11,0.12)',
    glow:      'rgba(245,158,11,0.30)',
    barGrad:   'linear-gradient(90deg, #d97706, #f59e0b)',
    glowClass: 'glow-amber',
  },
  weak: {
    badgeText: 'REVIEW REQUIRED',
    color:     '#ef4444',
    bg:        'rgba(239,68,68,0.12)',
    glow:      'rgba(239,68,68,0.30)',
    barGrad:   'linear-gradient(90deg, #dc2626, #ef4444)',
    glowClass: 'glow-red',
  },
}

export default function ConfidenceBar({ confidence, label }: Props) {
  const meta = LABEL_META[label] ?? LABEL_META.weak
  const pct  = Math.round(confidence * 100)

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span
          className={meta.glowClass}
          style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            color: meta.color, background: meta.bg,
            border: `1px solid ${meta.color}40`,
            padding: '4px 10px', borderRadius: 6,
          }}
        >
          {meta.badgeText}
        </span>
        <span style={{
          fontSize: 22, fontWeight: 700, color: meta.color,
          fontFamily: 'var(--mono)', letterSpacing: '-0.02em',
        }}>
          {pct}%
        </span>
      </div>

      {/* Track */}
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: meta.barGrad,
          borderRadius: 3,
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 8px ${meta.glow}`,
        }} />
      </div>
    </div>
  )
}
