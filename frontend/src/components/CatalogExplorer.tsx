import React, { useEffect, useMemo, useState } from 'react'

interface CatalogItem {
  sku: string; desc: string
  family: string | null; material: string | null; finish: string | null
  system: string | null; diameter: string | null; length: string | null
}

function Tag({ label, color = '#6b7a8d' }: { label: string; color?: string }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 4,
      background: `${color}18`, border: `1px solid ${color}30`,
      color, fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{children}</div>
    </div>
  )
}

function FPill({ label, count, active, color, onClick }: { label: string; count: number; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 10, padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
      background: active ? `${color}18` : 'transparent',
      border: `1px solid ${active ? color + '55' : 'var(--border)'}`,
      color: active ? color : 'var(--text)', fontWeight: active ? 700 : 400,
      transition: 'all 0.15s',
    }}>
      {label} <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 9 }}>{count}</span>
    </button>
  )
}

export default function CatalogExplorer({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fFam, setFam]   = useState<string | null>(null)
  const [fMat, setMat]   = useState<string | null>(null)
  const [fFin, setFin]   = useState<string | null>(null)
  const [fSys, setSys]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/catalog').then(r => r.json()).then(d => { setItems(d); setLoading(false) })
  }, [])

  const families = useMemo(() => {
    const c: Record<string, number> = {}
    items.forEach(i => { if (i.family) c[i.family] = (c[i.family] || 0) + 1 })
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 11)
  }, [items])

  const materials = useMemo(() => {
    const c: Record<string, number> = {}
    items.forEach(i => { if (i.material) c[i.material] = (c[i.material] || 0) + 1 })
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [items])

  const finishes = useMemo(() => {
    const c: Record<string, number> = {}
    items.forEach(i => { if (i.finish) c[i.finish] = (c[i.finish] || 0) + 1 })
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [items])

  const sysCounts = useMemo(() => ({
    metric:   items.filter(i => i.system === 'metric').length,
    imperial: items.filter(i => i.system === 'imperial').length,
  }), [items])

  const famNames   = families.map(([f]) => f)
  const matNames   = materials.map(([m]) => m)

  const heatmap = useMemo(() => {
    const m: Record<string, Record<string, number>> = {}
    famNames.forEach(f => { m[f] = {}; matNames.forEach(mat => { m[f][mat] = 0 }) })
    items.forEach(i => {
      if (i.family && i.material && m[i.family] && matNames.includes(i.material))
        m[i.family][i.material] = (m[i.family][i.material] || 0) + 1
    })
    return m
  }, [items, famNames, matNames])

  const maxHeat = useMemo(() => {
    let x = 0
    famNames.forEach(f => matNames.forEach(m => { x = Math.max(x, heatmap[f]?.[m] || 0) }))
    return x
  }, [heatmap, famNames, matNames])

  const filtered = useMemo(() => items.filter(i => {
    if (fFam && i.family   !== fFam) return false
    if (fMat && i.material !== fMat) return false
    if (fFin && i.finish   !== fFin) return false
    if (fSys && i.system   !== fSys) return false
    if (search) {
      const q = search.toLowerCase()
      return i.sku.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)
    }
    return true
  }), [items, fFam, fMat, fFin, fSys, search])

  const hasFilter = !!(fFam || fMat || fFin || fSys || search)
  const showHeat  = !fFam && !fMat && !search
  const bd        = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const panelBg   = dark ? 'rgba(6,11,26,0.97)'    : 'rgba(248,251,255,0.99)'
  const rowBg     = dark ? 'rgba(255,255,255,0.015)': 'rgba(0,0,0,0.015)'
  const rowHover  = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'stretch', padding: 20 }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 1280, margin: '0 auto',
        background: panelBg, border: `1px solid ${bd}`, borderRadius: 18,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '14px 22px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#10b981' }}>▦ CATALOG EXPLORER</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              · {items.length} ACTIVE ROWS
            </span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${bd}`, color: 'var(--muted)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="skeleton" style={{ width: 220, height: 20, borderRadius: 6 }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* Filters */}
            <div style={{ width: 220, padding: 16, overflow: 'auto', borderRight: `1px solid ${bd}`, flexShrink: 0 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="search sku/desc..."
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${bd}`, color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
              />

              <FilterGroup label="FAMILY">
                {families.map(([f, c]) => (
                  <FPill key={f} label={f.replace(/_/g, ' ')} count={c} active={fFam === f} color="#10b981" onClick={() => setFam(fFam === f ? null : f)} />
                ))}
              </FilterGroup>

              <FilterGroup label="MATERIAL">
                {materials.map(([m, c]) => (
                  <FPill key={m} label={m} count={c} active={fMat === m} color="#a78bfa" onClick={() => setMat(fMat === m ? null : m)} />
                ))}
              </FilterGroup>

              <FilterGroup label="FINISH">
                {finishes.map(([fn, c]) => (
                  <FPill key={fn} label={fn.toUpperCase()} count={c} active={fFin === fn} color="#06b6d4" onClick={() => setFin(fFin === fn ? null : fn)} />
                ))}
              </FilterGroup>

              <FilterGroup label="THREAD SYSTEM">
                <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                  {(['metric', 'imperial'] as const).map(sys => (
                    <button key={sys} onClick={() => setSys(fSys === sys ? null : sys)} style={{
                      flex: 1, padding: '7px 4px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: fSys === sys ? 'rgba(16,185,129,0.12)' : 'transparent',
                      border: `1px solid ${fSys === sys ? 'rgba(16,185,129,0.35)' : bd}`,
                      color: fSys === sys ? '#10b981' : 'var(--muted)',
                    }}>
                      {sys}<br />
                      <span style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 400 }}>{sysCounts[sys]}</span>
                    </button>
                  ))}
                </div>
              </FilterGroup>
            </div>

            {/* Main */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

              {/* Heatmap */}
              {showHeat && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      FAMILY × MATERIAL HEATMAP
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>click cell to filter · max {maxHeat}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: `152px repeat(${matNames.length}, 1fr)`, gap: 3 }}>
                    <div />
                    {matNames.map(m => (
                      <div key={m} style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', paddingBottom: 8 }}>
                        {m}
                      </div>
                    ))}
                    {famNames.map(f => (
                      <React.Fragment key={f}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center' }}>
                          {f.replace(/_/g, ' ')}
                        </div>
                        {matNames.map(m => {
                          const n = heatmap[f]?.[m] || 0
                          const intensity = maxHeat > 0 ? n / maxHeat : 0
                          const alpha = 0.18 + intensity * 0.75
                          return (
                            <button key={m}
                              onClick={() => { if (n) { setFam(f); setMat(m) } }}
                              onMouseEnter={e => { if (n) e.currentTarget.style.transform = 'scale(1.08)' }}
                              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                              style={{
                                padding: '9px 2px', borderRadius: 5, border: 'none',
                                cursor: n > 0 ? 'pointer' : 'default',
                                background: n > 0 ? `rgba(180,140,30,${alpha})` : (dark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'),
                                color: n > 0 ? (intensity > 0.55 ? '#fff' : (dark ? '#fbbf24' : '#92400e')) : 'transparent',
                                fontSize: 11, fontWeight: 700, transition: 'transform 0.1s',
                              }}
                            >{n > 0 ? n : ''}</button>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {showHeat && <div style={{ height: 1, background: bd, marginBottom: 16 }} />}

              {/* Row list */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>ROWS</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    showing {Math.min(50, filtered.length)} of {filtered.length} matches · capped at 50
                  </span>
                  {hasFilter && (
                    <button onClick={() => { setFam(null); setMat(null); setFin(null); setSys(null); setSearch('') }}
                      style={{ fontSize: 10, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>
                      ✕ clear
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filtered.slice(0, 50).map(item => (
                  <div key={item.sku}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 7, border: `1px solid ${bd}`, background: rowBg, transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = rowHover}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  >
                    <span style={{ fontSize: 11, color: '#06b6d4', fontFamily: 'var(--mono)', flexShrink: 0, minWidth: 170 }}>{item.sku}</span>
                    <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {item.diameter && <Tag label={item.diameter} />}
                      {item.length   && <Tag label={item.length}   color="#06b6d4" />}
                      {item.material && <Tag label={item.material} color="#a78bfa" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
