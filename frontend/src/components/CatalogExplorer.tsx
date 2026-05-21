import React, { useEffect, useMemo, useState } from 'react'

interface CatalogItem {
  sku: string; desc: string
  family: string | null; material: string | null; finish: string | null
  system: string | null; diameter: string | null; length: string | null
}

interface DemandData {
  orders: number; customers: number; last_date: string
  heat: 'hot' | 'warm' | 'cold'
}

interface Substitute {
  sku: string; description: string; score: number; reasons: string[]
  family: string | null; material: string | null
  diameter: string | null; length: string | null; finish: string | null
}

const HEAT_COLOR = { hot: '#10b981', warm: '#f59e0b', cold: '#6b7a8d', dead: '#ef4444' }

function Tag({ label, color = '#6b7a8d' }: { label: string; color?: string }) {
  return (
    <span style={{
      fontSize: 9, padding: '1px 6px', borderRadius: 3,
      background: `${color}18`, border: `1px solid ${color}30`,
      color, fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

export default function CatalogExplorer({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  const [items, setItems]           = useState<CatalogItem[]>([])
  const [demand, setDemand]         = useState<Record<string, DemandData>>({})
  const [subs, setSubs]             = useState<Record<string, Substitute[]>>({})
  const [loadingSku, setLoadingSku] = useState<string | null>(null)
  const [expandedSku, setExpanded]  = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [fFam, setFam]              = useState<string | null>(null)
  const [fMat, setMat]              = useState<string | null>(null)
  const [fFin, setFin]              = useState<string | null>(null)
  const [fSys, setSys]              = useState<string | null>(null)
  const [demandFilter, setDemandF]  = useState<'all' | 'dead'>('all')

  useEffect(() => {
    Promise.all([
      fetch('/api/catalog').then(r => r.json()),
      fetch('/api/catalog/demand').then(r => r.json()),
    ]).then(([cat, dem]) => { setItems(cat); setDemand(dem); setLoading(false) })
  }, [])

  const families = useMemo(() => {
    const c: Record<string, number> = {}
    items.forEach(i => { if (i.family) c[i.family] = (c[i.family] || 0) + 1 })
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12)
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

  const getHeat = (sku: string): 'hot' | 'warm' | 'cold' | 'dead' =>
    demand[sku]?.heat ?? 'dead'

  const heatOrder: Record<string, number> = { hot: 0, warm: 1, cold: 2, dead: 3 }

  const deadCount = useMemo(() => items.filter(i => getHeat(i.sku) === 'dead').length, [items, demand])

  const filtered = useMemo(() => {
    let list = items.filter(i => {
      if (fFam && i.family   !== fFam) return false
      if (fMat && i.material !== fMat) return false
      if (fFin && i.finish   !== fFin) return false
      if (fSys && i.system   !== fSys) return false
      if (search) {
        const q = search.toLowerCase()
        return i.sku.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)
      }
      return true
    })
    if (demandFilter === 'dead') list = list.filter(i => getHeat(i.sku) === 'dead')
    list.sort((a, b) => heatOrder[getHeat(a.sku)] - heatOrder[getHeat(b.sku)])
    return list
  }, [items, fFam, fMat, fFin, fSys, search, demandFilter, demand])

  const loadSubs = async (sku: string) => {
    if (expandedSku === sku) { setExpanded(null); return }
    setExpanded(sku)
    if (subs[sku] !== undefined) return
    setLoadingSku(sku)
    try {
      const data: Substitute[] = await fetch(`/api/catalog/${sku}/substitutes`).then(r => r.json())
      setSubs(prev => ({ ...prev, [sku]: data }))
    } catch {
      setSubs(prev => ({ ...prev, [sku]: [] }))
    }
    setLoadingSku(null)
  }

  const hasFilter = !!(fFam || fMat || fFin || fSys || search || demandFilter !== 'all')
  const bd        = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const panelBg   = dark ? 'rgba(6,11,26,0.97)'    : 'rgba(248,251,255,0.99)'
  const rowBg     = dark ? 'rgba(255,255,255,0.015)': 'rgba(0,0,0,0.015)'
  const rowHover  = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  const subsBg    = dark ? 'rgba(255,255,255,0.025)': 'rgba(0,0,0,0.02)'

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
        <div style={{ padding: '14px 22px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#10b981' }}>◈ CATALOG INTELLIGENCE</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{items.length} parts</span>
            {!loading && (
              <div style={{ display: 'flex', gap: 4 }}>
                {([['all', `ALL`, '#6b7a8d'], ['dead', `NEVER ORDERED ${deadCount}`, '#ef4444']] as const).map(([f, label, col]) => (
                  <button key={f} onClick={() => setDemandF(f === demandFilter ? 'all' : f)} style={{
                    fontSize: 10, padding: '3px 10px', borderRadius: 5, cursor: 'pointer', fontWeight: 700,
                    background: demandFilter === f ? `${col}18` : 'transparent',
                    border: `1px solid ${demandFilter === f ? col + '55' : bd}`,
                    color: demandFilter === f ? col : 'var(--muted)',
                    letterSpacing: '0.05em', transition: 'all 0.15s',
                  }}>{label}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${bd}`, color: 'var(--muted)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="skeleton" style={{ width: 220, height: 20, borderRadius: 6 }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* Filters sidebar */}
            <div style={{ width: 200, padding: 16, overflow: 'auto', borderRight: `1px solid ${bd}`, flexShrink: 0 }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="search sku / desc..."
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${bd}`, color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 18 }}
              />

              {([
                { label: 'FAMILY',   entries: families,  active: fFam, set: setFam, color: '#10b981', fmt: (s: string) => s.replace(/_/g, ' ') },
                { label: 'MATERIAL', entries: materials, active: fMat, set: setMat, color: '#a78bfa', fmt: (s: string) => s },
                { label: 'FINISH',   entries: finishes,  active: fFin, set: setFin, color: '#06b6d4', fmt: (s: string) => s.replace(/_/g, ' ').toUpperCase() },
              ] as const).map(({ label, entries, active, set, color, fmt }) => (
                <div key={label} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {entries.map(([v, c]) => (
                      <button key={v} onClick={() => (set as (x: string | null) => void)(active === v ? null : v)} style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                        background: active === v ? `${color}18` : 'transparent',
                        border: `1px solid ${active === v ? color + '55' : bd}`,
                        color: active === v ? color : 'var(--text)', fontWeight: active === v ? 700 : 400,
                      }}>
                        {fmt(v)} <span style={{ color: 'var(--muted)', fontSize: 9, fontFamily: 'var(--mono)' }}>{c as number}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>SYSTEM</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {(['metric', 'imperial'] as const).map(sys => (
                    <button key={sys} onClick={() => setSys(fSys === sys ? null : sys)} style={{
                      flex: 1, padding: '6px 4px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                      background: fSys === sys ? 'rgba(16,185,129,0.10)' : 'transparent',
                      border: `1px solid ${fSys === sys ? 'rgba(16,185,129,0.35)' : bd}`,
                      color: fSys === sys ? '#10b981' : 'var(--muted)',
                    }}>{sys}</button>
                  ))}
                </div>
              </div>

              {hasFilter && (
                <button
                  onClick={() => { setFam(null); setMat(null); setFin(null); setSys(null); setSearch(''); setDemandF('all') }}
                  style={{ fontSize: 10, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  ✕ clear all
                </button>
              )}
            </div>

            {/* Main list */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

              {/* Legend + count bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {filtered.length} parts · sorted by demand
                </span>
                <div style={{ display: 'flex', gap: 14, fontSize: 10, color: 'var(--muted)' }}>
                  {(['hot', 'warm', 'cold', 'dead'] as const).map(h => (
                    <span key={h} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: HEAT_COLOR[h], display: 'inline-block', flexShrink: 0 }} />
                      {h === 'dead' ? 'never ordered' : h === 'hot' ? 'last 90d' : h === 'warm' ? '90–180d' : '180d+'}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filtered.map(item => {
                  const h       = getHeat(item.sku)
                  const hColor  = HEAT_COLOR[h]
                  const dem     = demand[item.sku]
                  const isExp   = expandedSku === item.sku
                  const itemSubs     = subs[item.sku]
                  const isFetching   = loadingSku === item.sku

                  return (
                    <div key={item.sku}>
                      <div
                        onClick={() => loadSubs(item.sku)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px',
                          borderRadius: isExp ? '7px 7px 0 0' : 7,
                          border: `1px solid ${isExp ? hColor + '44' : bd}`,
                          borderLeft: `3px solid ${hColor}`,
                          background: isExp ? `${hColor}08` : rowBg,
                          cursor: 'pointer', transition: 'background 0.1s, border-color 0.1s',
                        }}
                        onMouseEnter={e => { if (!isExp) (e.currentTarget as HTMLElement).style.background = rowHover }}
                        onMouseLeave={e => { if (!isExp) (e.currentTarget as HTMLElement).style.background = rowBg }}
                      >
                        <span style={{ fontSize: 10, color: '#06b6d4', fontFamily: 'var(--mono)', flexShrink: 0, minWidth: 165 }}>{item.sku}</span>
                        <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</span>
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          {item.diameter && <Tag label={item.diameter} />}
                          {item.length   && <Tag label={item.length}   color="#06b6d4" />}
                          {item.material && <Tag label={item.material} color="#a78bfa" />}
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 100 }}>
                          {dem ? (
                            <>
                              <div style={{ fontSize: 10, fontWeight: 700, color: hColor, fontFamily: 'var(--mono)' }}>{dem.orders} orders</div>
                              <div style={{ fontSize: 9, color: 'var(--muted)' }}>{dem.customers} customer{dem.customers !== 1 ? 's' : ''} · {dem.last_date}</div>
                            </>
                          ) : (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', letterSpacing: '0.04em' }}>NEVER ORDERED</span>
                          )}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, display: 'inline-block', transition: 'transform 0.2s', transform: isExp ? 'rotate(180deg)' : 'none' }}>▾</span>
                      </div>

                      {isExp && (
                        <div style={{
                          borderRadius: '0 0 7px 7px',
                          border: `1px solid ${hColor}44`,
                          borderTop: 'none',
                          background: subsBg,
                          padding: '12px 14px',
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                            COMPATIBLE SUBSTITUTES
                            {isFetching
                              ? <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 400 }}>loading...</span>
                              : <span style={{ marginLeft: 8, fontWeight: 400 }}>· {(itemSubs ?? []).length} found</span>
                            }
                          </div>
                          {!isFetching && (itemSubs ?? []).length === 0 && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>No compatible substitutes in catalog.</div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {(itemSubs ?? []).map(sub => (
                              <div key={sub.sku} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '7px 10px', borderRadius: 5,
                                border: `1px solid ${bd}`,
                                background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                              }}>
                                <span style={{ fontSize: 10, color: '#06b6d4', fontFamily: 'var(--mono)', minWidth: 165, flexShrink: 0 }}>{sub.sku}</span>
                                <span style={{ fontSize: 11, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.description}</span>
                                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                                  {sub.reasons.slice(0, 3).map(r => <Tag key={r} label={r} color="#10b981" />)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
