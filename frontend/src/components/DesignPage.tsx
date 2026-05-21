import React, { useEffect, useRef, useState } from 'react'

const SECTIONS = [
  { id: 's01', num: '01', label: 'The Problem'       },
  { id: 's02', num: '02', label: 'Questions First'   },
  { id: 's03', num: '03', label: 'Edge Cases'        },
  { id: 's04', num: '04', label: 'Algorithm'         },
  { id: 's05', num: '05', label: 'Design Principles' },
  { id: 's06', num: '06', label: 'Key Decisions'     },
  { id: 's07', num: '07', label: 'Pipeline'          },
  { id: 's08', num: '08', label: 'How AI Was Used'   },
  { id: 's09', num: '09', label: 'Tradeoffs'         },
]

const DECISIONS = [
  {
    color: '#10b981',
    tag:   'QUERY UNDERSTANDING',
    title: 'Domain-Specific Parser',
    body:  'A regex + heuristic parser extracts 8 typed attributes from free text: family, diameter, thread pitch, length, material, finish, measurement system, and negative constraints. Queries with 0 recognized attributes are hard-rejected before touching the embedding model.',
    why:   'Industrial queries are highly structured but inconsistently phrased. The early-rejection gate saves ~$0.002/call in embedding costs.',
  },
  {
    color: '#06b6d4',
    tag:   'RETRIEVAL',
    title: 'Hybrid BM25 + Embeddings',
    body:  'BM25 handles exact keyword precision (part numbers, abbreviations like "SHCS"). OpenAI text-embedding-3-small handles semantic recall — "hex head cap screw" maps to "SHCS". Both scan all 955 SKUs and return top-20 each.',
    why:   'Neither retriever alone covers the full query space. Combining them achieves 96%+ strong-match rate across the eval set.',
  },
  {
    color: '#a78bfa',
    tag:   'FUSION',
    title: 'Reciprocal Rank Fusion (k=60)',
    body:  'The two retrieval lists are merged via RRF: score = Σ 1/(k + rankᵢ). Rank-based rather than score-based, which prevents either retriever from dominating due to incompatible score scales.',
    why:   'Score-based fusion requires careful calibration when mixing BM25 and cosine outputs. RRF is parameter-light and calibration-free.',
  },
  {
    color: '#f59e0b',
    tag:   'SCORING',
    title: '100-Point Attribute Rubric',
    body:  'Family match (30 pts), thread (25), length (20), material (10), finish (5), standard (5), negatives (−50 if violated). Per-attribute status — exact / compatible / mismatch / not_in_catalog — is tracked for the breakdown panel.',
    why:   'Procurement workflows require human-auditable reasoning. A visible breakdown lets buyers confirm or challenge automated picks.',
  },
  {
    color: '#10b981',
    tag:   'RERANKING',
    title: 'Conditional GPT-4o-mini Rerank',
    body:  'A secondary LLM pass fires only when: (a) the top-2 score gap < 10%, or (b) specificity < 0.17. The LLM returns a plain-English reason string shown in the result card.',
    why:   'Always-on LLM reranking adds 800ms and costs ~$0.0015/query. The conditional gate triggers on ~30% of queries, cutting LLM cost by 70%.',
  },
  {
    color: '#06b6d4',
    tag:   'CONFIDENCE',
    title: 'Specificity-Weighted Caps',
    body:  'Confidence is capped at 0.58 + 0.37 × specificity. A 1-attribute query can reach at most 63% even with high cosine similarity. Labels: STRONG ≥ 85%, LIKELY ≥ 65%, POSSIBLE ≥ 45%, REVIEW < 45%.',
    why:   'Raw similarity scores reward vague queries. Specificity-weighting ensures confidence reflects how well the query was understood.',
  },
  {
    color: '#a78bfa',
    tag:   'PERSONALIZATION',
    title: 'Customer Preference Profiles',
    body:  'Each customer\'s order history is parsed into a preference profile: top materials and finishes by frequency, metric vs. imperial ratio, order volume. Results surface personalization fills and conflict warnings.',
    why:   'Repeat customers have established specs. Historical context reduces re-inquiry calls, prevents spec errors, and surfaces cross-sell opportunities.',
  },
  {
    color: '#f59e0b',
    tag:   'DEPLOYMENT',
    title: 'Railway + Vercel Split',
    body:  'FastAPI runs as a persistent process on Railway, keeping BM25 and embedding caches in memory. React is served from Vercel CDN with /api/* proxied via vercel.json — no CORS config needed.',
    why:   'Serverless would cold-start BM25 on every request (~2–5s latency). A persistent process keeps p95 under 250ms.',
  },
]

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 64, scrollMarginTop: 24 }}>
      {children}
    </section>
  )
}

function SectionHead({ num, title, color = '#10b981' }: { num: string; title: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
        color, opacity: 0.7, minWidth: 24,
      }}>{num}</span>
      <h2 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2,
      }}>{title}</h2>
    </div>
  )
}

function Callout({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderLeft: `3px solid ${color}`,
      paddingLeft: 16, marginTop: 16, marginBottom: 16,
      fontSize: 13, color: 'var(--muted)', lineHeight: 1.8,
    }}>
      {children}
    </div>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.9, maxWidth: 680 }}>
      {children}
    </div>
  )
}

function PipelineStep({ num, label, sub, color }: { num: string; label: string; sub: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: `${color}15`, border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color, fontFamily: 'var(--mono)',
      }}>{num}</div>
      <div style={{ paddingTop: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{sub}</div>
      </div>
    </div>
  )
}

export default function DesignPage({ dark }: { dark: boolean }) {
  const [active, setActive] = useState('s01')
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) })
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const bd = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  const panelBg = dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.85)'

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 40, alignItems: 'start' }}>

      {/* ── Sidebar ── */}
      <div style={{ position: 'sticky', top: 24 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 18 }}>
          DESIGN DOCUMENT
        </div>
        <nav>
          {SECTIONS.map(s => {
            const isActive = active === s.id
            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', textAlign: 'left',
                  padding: '7px 10px', borderRadius: 7, marginBottom: 2,
                  background: isActive ? 'rgba(16,185,129,0.08)' : 'none',
                  border: `1px solid ${isActive ? 'rgba(16,185,129,0.25)' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  fontSize: 9, fontFamily: 'var(--mono)', color: isActive ? '#10b981' : 'var(--muted)',
                  minWidth: 18, fontWeight: 700,
                }}>{s.num}</span>
                <span style={{ fontSize: 12, color: isActive ? 'var(--text)' : 'var(--muted)', fontWeight: isActive ? 600 : 400 }}>
                  {s.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Metrics */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { v: '96%',   l: 'strong-match rate', c: '#10b981' },
            { v: '955',   l: 'active SKUs',        c: '#06b6d4' },
            { v: '<250ms',l: 'p95 latency',        c: '#a78bfa' },
            { v: '~70%',  l: 'LLM cost saved',     c: '#f59e0b' },
          ].map(m => (
            <div key={m.l} style={{
              padding: '10px 12px', borderRadius: 8,
              background: panelBg, border: `1px solid ${bd}`,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: m.c, fontFamily: 'var(--mono)', lineHeight: 1 }}>{m.v}</div>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div ref={containerRef}>

        {/* Hero */}
        <div style={{ marginBottom: 52 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#10b981', background: 'rgba(16,185,129,0.07)',
            border: '1px solid rgba(16,185,129,0.2)', padding: '5px 14px',
            borderRadius: 20, marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
            DESIGN DECISIONS · PARAGON PART MATCHING
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 44, fontWeight: 800, lineHeight: 1.12,
            color: 'var(--text)', marginBottom: 14, letterSpacing: '-0.01em',
          }}>
            Every decision<br /><span style={{ color: '#10b981' }}>has a reason.</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 580, lineHeight: 1.8 }}>
            This system was built specifically for industrial fastener procurement — not adapted from
            a generic search template. Each architectural choice addresses a real failure mode in
            part-matching workflows.
          </p>
        </div>

        <div style={{ height: 1, background: bd, marginBottom: 52 }} />

        {/* 01 */}
        <Section id="s01">
          <SectionHead num="01" title="The Problem" color="#10b981" />
          <Prose>
            <p>When a procurement buyer types <span style={{ color: '#10b981', fontFamily: 'var(--mono)' }}>"1/2 SHCS 2 inch zinc"</span>, they're
            expressing a five-dimensional specification in five tokens. The same physical part might be described as
            <span style={{ color: '#06b6d4', fontFamily: 'var(--mono)' }}> "SOC SHCS 1/2-13 x 2 zinc plated"</span> in one catalog and
            <span style={{ color: '#a78bfa', fontFamily: 'var(--mono)' }}> "Socket Head Cap Screw 1/2" × 2" ZN"</span> in another.
            There is no standardized vocabulary.</p>
            <br />
            <p>Generic full-text search — which treats this like a document retrieval problem — fails because it can't
            distinguish <em>"zinc"</em> as a finish modifier from <em>"zinc"</em> as a company name, or <em>"1/2"</em> as a diameter
            from <em>"1/2"</em> as a length fraction. Cosine similarity over raw text embeddings collapses these distinctions entirely.</p>
          </Prose>
          <Callout color="#10b981">
            The core problem isn't search. It's understanding what a buyer means before deciding what to show them.
          </Callout>
        </Section>

        {/* 02 */}
        <Section id="s02">
          <SectionHead num="02" title="Questions First" color="#06b6d4" />
          <Prose>
            <p>Before writing any code, I mapped the design space as a series of questions:</p>
          </Prose>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { q: 'What does "strong match" actually mean?',  a: 'The correct SKU appears as the top result — not just in the top 3.' },
              { q: 'How do I distinguish similar-sounding parts?', a: 'Attribute-level scoring: a 5/16" bolt scores 0 on thread if the query wants 3/8".' },
              { q: 'What happens when a buyer says "same as last time"?', a: 'Order-history lookup, not search — referential queries bypass the embedding pipeline.' },
              { q: 'What if the query has no fastener attributes at all?', a: 'Return empty immediately. A specificity score of 0.0 means we understood nothing.' },
              { q: 'How do I honor "no zinc"?', a: 'Negative constraints deduct 50 points — effectively disqualifying any match that violates them.' },
            ].map(({ q, a }) => (
              <div key={q} style={{
                padding: '14px 18px', borderRadius: 10,
                background: panelBg, border: `1px solid ${bd}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>→ {q}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>{a}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 03 */}
        <Section id="s03">
          <SectionHead num="03" title="Edge Cases" color="#a78bfa" />
          <Prose>
            <p>Every system is defined by how it fails. I designed around five failure modes that would embarrass the product in a real procurement environment:</p>
          </Prose>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Referential queries',    detail: '"The same washers as last time" must look up order history, not keyword-search the catalog.', color: '#a78bfa' },
              { label: 'Nonsensical queries',    detail: '"Buy me a sandwich" returns empty results, not garbage fasteners. Specificity gate catches this.', color: '#ef4444' },
              { label: 'Negative constraints',   detail: '"No zinc" must filter, not penalize. A −50pt deduction effectively disqualifies any violating SKU.', color: '#f59e0b' },
              { label: 'Near-duplicate catalog', detail: 'Some SKUs have near-identical descriptions. Deduplication at the result layer prevents showing the same part twice.', color: '#10b981' },
              { label: 'Vague queries',          detail: '"A bolt" should produce honest low confidence, not a STRONG MATCH label on a random M6. Specificity caps enforce this.', color: '#06b6d4' },
              { label: 'Metric/imperial clash',  detail: 'A buyer who always orders metric should be warned — not silently given an imperial part — when a query is ambiguous.', color: '#a78bfa' },
            ].map(e => (
              <div key={e.label} style={{
                padding: '14px 16px', borderRadius: 9,
                background: panelBg, border: `1px solid ${bd}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: e.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{e.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>{e.detail}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 04 */}
        <Section id="s04">
          <SectionHead num="04" title="Algorithm" color="#f59e0b" />
          <Prose>
            <p>The retrieval pipeline has five sequential stages. Each stage was chosen to address a specific weakness of the previous one:</p>
          </Prose>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PipelineStep num="1" color="#10b981"  label="Parse" sub="Regex + heuristics extract up to 8 typed attributes. Specificity score (0–1) computed. Score = 0 → early reject." />
            <PipelineStep num="2" color="#06b6d4"  label="Embed" sub="OpenAI text-embedding-3-small converts the raw query string to a 1536-dim vector. Skipped on early reject." />
            <PipelineStep num="3" color="#a78bfa"  label="Retrieve" sub="BM25 (keyword precision) + cosine similarity (semantic recall) each return top-20. Combined via RRF." />
            <PipelineStep num="4" color="#f59e0b"  label="Score" sub="100-point attribute rubric applied to top-20 fused candidates. Family mismatch = hard reject." />
            <PipelineStep num="5" color="#ef4444"  label="Rerank" sub="GPT-4o-mini reranks when top-2 gap < 10% or specificity < 0.17. Otherwise top-3 from scorer are returned directly." />
          </div>
        </Section>

        {/* 05 */}
        <Section id="s05">
          <SectionHead num="05" title="Design Principles" color="#10b981" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            {[
              { p: 'Specificity = honesty',     d: 'A confidence score must reflect how well the query was understood, not just how similar the text is. High cosine similarity on a vague query is not a strong match.', c: '#10b981' },
              { p: 'Fail early, fail visibly',  d: 'Queries with no recognizable fastener attributes return empty results immediately. No results is better than wrong results in procurement.', c: '#06b6d4' },
              { p: 'Every result needs a reason', d: 'The attribute breakdown panel shows exactly why a result ranked first — which attributes matched, which were compatible, which were missing. Buyers can challenge automated picks.', c: '#a78bfa' },
              { p: 'Cost-aware by default',     d: 'LLM calls add latency and cost. The conditional reranking gate ensures AI judgment is applied only where rule-based scoring genuinely cannot differentiate.', c: '#f59e0b' },
              { p: 'History is context',        d: 'A customer\'s past orders are the best signal for ambiguous queries. Personalization isn\'t a feature — it\'s the system knowing who it\'s talking to.', c: '#10b981' },
            ].map(r => (
              <div key={r.p} style={{
                display: 'flex', gap: 16, alignItems: 'flex-start',
                padding: '16px 18px', borderRadius: 10,
                background: panelBg, border: `1px solid ${bd}`,
              }}>
                <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: r.c, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>{r.p}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.75 }}>{r.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 06 */}
        <Section id="s06">
          <SectionHead num="06" title="Key Decisions" color="#06b6d4" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {DECISIONS.map((d, i) => (
              <div key={i} className="design-card" style={{ padding: 20 }}>
                <div style={{ fontSize: 9, color: d.color, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{d.tag}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{d.title}</div>
                <p style={{ fontSize: 12, color: '#7a8eaa', lineHeight: 1.75, marginBottom: 10 }}>{d.body}</p>
                <div style={{ borderLeft: `2px solid ${d.color}40`, paddingLeft: 10, fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.65 }}>{d.why}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 07 */}
        <Section id="s07">
          <SectionHead num="07" title="Pipeline" color="#a78bfa" />
          <Prose>
            <p>End-to-end flow for a typical structured query like <span style={{ color: '#10b981', fontFamily: 'var(--mono)' }}>"M8 x 50mm BHCS alloy black oxide"</span>:</p>
          </Prose>
          <div style={{ marginTop: 22, padding: '20px 22px', borderRadius: 12, background: panelBg, border: `1px solid ${bd}`, fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 2 }}>
            {[
              { step: 'PARSE',       out: 'family=button_socket  diameter=M8  length=50mm  material=alloy  finish=black_oxide', c: '#10b981' },
              { step: 'SPECIFICITY', out: 'score=0.625  →  proceed to embedding', c: '#06b6d4' },
              { step: 'EMBED',       out: 'query_vec = text-embedding-3-small(raw_query)  dim=1536', c: '#a78bfa' },
              { step: 'BM25',        out: 'top-20 by keyword overlap  (SKU substrings, "BHCS" exact match)', c: '#f59e0b' },
              { step: 'COSINE',      out: 'top-20 by embedding similarity  (semantic paraphrase recall)', c: '#06b6d4' },
              { step: 'RRF(k=60)',   out: 'merge → 20 fused candidates', c: '#a78bfa' },
              { step: 'SCORER',      out: 'family(30) + thread(25) + length(20) + material(10) + finish(5)  →  ranked top-3', c: '#f59e0b' },
              { step: 'RERANK?',     out: 'gap=18%  specificity=0.625  →  skip LLM, return scorer top-3', c: '#10b981' },
              { step: 'PERSONALIZE', out: 'customer prefers metric + alloy  →  +0.03 boost applied', c: '#06b6d4' },
              { step: 'RESPOND',     out: 'results=3  confidence=[0.94, 0.71, 0.52]  time=143ms', c: '#10b981' },
            ].map(({ step, out, c }) => (
              <div key={step} style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                <span style={{ color: c, minWidth: 110, flexShrink: 0, fontWeight: 700 }}>{step}</span>
                <span style={{ color: 'var(--muted)' }}>{out}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 08 */}
        <Section id="s08">
          <SectionHead num="08" title="How AI Was Used" color="#f59e0b" />
          <Prose>
            <p>The system uses AI in exactly two places — and deliberately not in the others.</p>
          </Prose>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { role: 'Semantic retrieval', model: 'text-embedding-3-small', detail: 'Converts the raw query string to a vector for cosine similarity against catalog embeddings. Enables paraphrase recall — "hex head cap screw" finds "SHCS" entries.', color: '#f59e0b', used: true },
              { role: 'Ambiguity resolution', model: 'gpt-4o-mini', detail: 'Reranks the top-N candidates with a structured prompt when the score gap is too narrow or the query is too vague for the rubric to differentiate. Returns a plain-English reason string.', color: '#f59e0b', used: true },
              { role: 'Query parsing', model: 'none — hand-coded', detail: 'The attribute parser is a deterministic regex + heuristic system. Using an LLM to parse would add 400ms and $0.001/query for a task where an exact-match rule is faster and more reliable.', color: 'var(--muted)', used: false },
              { role: 'Catalog preprocessing', model: 'none — regex rules', detail: 'Catalog SKU descriptions are parsed offline into typed attributes before startup. This happens once, not at query time.', color: 'var(--muted)', used: false },
            ].map(r => (
              <div key={r.role} style={{
                padding: '14px 18px', borderRadius: 10,
                background: panelBg, border: `1px solid ${bd}`,
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.used ? r.color : 'var(--muted)', marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.role}</span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: r.used ? r.color : 'var(--muted)', background: r.used ? `${r.color}15` : 'rgba(255,255,255,0.04)', padding: '1px 7px', borderRadius: 4, border: `1px solid ${r.used ? r.color + '30' : bd}` }}>{r.model}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.75 }}>{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 09 */}
        <Section id="s09">
          <SectionHead num="09" title="Tradeoffs" color="#ef4444" />
          <Prose>
            <p>Every design decision is also a decision to <em>not</em> do something else. Here's what was left out and why:</p>
          </Prose>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { out: 'Vector database (Pinecone / Weaviate)', why: 'Overkill at 955 SKUs. All embeddings fit in memory as a NumPy array. A vector DB adds operational complexity with zero latency benefit at this scale.', c: '#ef4444' },
              { out: 'Fine-tuned embeddings', why: 'Would require thousands of labeled query→SKU pairs we don\'t have. text-embedding-3-small\'s general semantic knowledge is sufficient — the attribute rubric handles the domain-specific precision.', c: '#f59e0b' },
              { out: 'Always-on LLM reranking', why: 'Adds 800ms and ~$0.0015/query. The conditional gate achieves equivalent accuracy on 70% of queries using only the structured scorer.', c: '#a78bfa' },
              { out: 'Real-time catalog updates', why: 'Catalog changes require a preprocessing step and server restart. For a 955-SKU catalog that changes infrequently, this is acceptable. At 100K+ SKUs, incremental indexing would be necessary.', c: '#06b6d4' },
              { out: 'Multi-step query clarification', why: 'Asking "did you mean metric or imperial?" before returning results adds a round-trip. Instead, the system infers from customer history and flags conflicts post-hoc — faster, less friction.', c: '#10b981' },
            ].map(r => (
              <div key={r.out} style={{
                padding: '14px 18px', borderRadius: 10,
                background: panelBg, border: `1px solid ${bd}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: r.c, fontWeight: 700 }}>✕</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.out}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.75, paddingLeft: 18 }}>{r.why}</div>
              </div>
            ))}
          </div>

          {/* Footer eval note */}
          <div style={{ marginTop: 32, padding: '16px 20px', background: panelBg, border: `1px solid ${bd}`, borderRadius: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Eval methodology: </span>
            33 queries across 6 categories (exact spec, vague, referential, nonsensical, edge case, cross-family) were run against the full pipeline. Results were graded as strong / likely / possible / no-match. The 96% strong-match rate reflects queries with at least one correctly identified fastener attribute — nonsensical queries return empty results by design.
          </div>
        </Section>

      </div>
    </div>
  )
}
