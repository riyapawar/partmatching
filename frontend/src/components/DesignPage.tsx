import React, { useEffect, useRef, useState } from 'react'

const SECTIONS = [
  { id: 's01', num: '01', label: 'The Semantic Gap'       },
  { id: 's02', num: '02', label: 'Specificity First'      },
  { id: 's03', num: '03', label: 'Two Retrievers'         },
  { id: 's04', num: '04', label: 'Teaching "Match"'       },
  { id: 's05', num: '05', label: 'When to Ask GPT'        },
  { id: 's06', num: '06', label: 'History as Signal'      },
  { id: 's07', num: '07', label: 'Honest Confidence'      },
  { id: 's08', num: '08', label: "What I'd Build Next"   },
]

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 72, scrollMarginTop: 24 }}>
      {children}
    </section>
  )
}

function SectionHead({ num, title, color = '#10b981' }: { num: string; title: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24, paddingBottom: 14, borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
      <span style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--mono)', color, opacity: 0.22, lineHeight: 1 }}>
        {num}
      </span>
      <h2 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, marginBottom: 2,
      }}>{title}</h2>
    </div>
  )
}

function Pull({ children, color = '#10b981' }: { color?: string; children: React.ReactNode }) {
  return (
    <div style={{
      margin: '24px 0', padding: '16px 20px',
      borderLeft: `3px solid ${color}`,
      fontSize: 15, fontStyle: 'italic',
      color: 'var(--text)', lineHeight: 1.75,
      opacity: 0.85,
    }}>
      {children}
    </div>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.95, maxWidth: 660 }}>
      {children}
    </div>
  )
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontFamily: 'var(--mono)',
      padding: '2px 8px', borderRadius: 4,
      background: `${color}12`, border: `1px solid ${color}30`, color,
    }}>{label}</span>
  )
}

function InlineBox({ title, children, color, dark }: { title: string; children: React.ReactNode; color: string; dark: boolean }) {
  const bg = dark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.85)'
  const bd = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  return (
    <div style={{ padding: '16px 20px', borderRadius: 10, background: bg, border: `1px solid ${bd}`, marginTop: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Formula({ dark }: { dark: boolean }) {
  const bg = dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'
  const bd = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  return (
    <div style={{ padding: '18px 22px', borderRadius: 10, background: bg, border: `1px solid ${bd}`, fontFamily: 'var(--mono)', marginTop: 20 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>CONFIDENCE CAP FORMULA</div>
      <div style={{ fontSize: 18, color: 'var(--text)', fontWeight: 600, marginBottom: 16, letterSpacing: '-0.01em' }}>
        cap = <span style={{ color: '#10b981' }}>0.58</span> + <span style={{ color: '#06b6d4' }}>0.37</span> × <span style={{ color: '#a78bfa' }}>specificity</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { spec: '0.0', cap: '0.58 (58%)', note: 'no attributes recognized — POSSIBLE at best', c: '#ef4444' },
          { spec: '0.125', cap: '0.63 (63%)', note: '1 of 8 attributes — still can\'t exceed LIKELY', c: '#f59e0b' },
          { spec: '0.5', cap: '0.77 (77%)', note: '4 of 8 attributes — can reach LIKELY', c: '#f59e0b' },
          { spec: '1.0', cap: '0.95 (95%)', note: 'all 8 attributes — STRONG MATCH is possible', c: '#10b981' },
        ].map(r => (
          <div key={r.spec} style={{ display: 'grid', gridTemplateColumns: '70px 90px 1fr', gap: 12, alignItems: 'baseline', fontSize: 11 }}>
            <span style={{ color: '#a78bfa' }}>spec={r.spec}</span>
            <span style={{ color: r.c, fontWeight: 600 }}>→ {r.cap}</span>
            <span style={{ color: 'var(--muted)' }}>{r.note}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DesignPage({ dark }: { dark: boolean }) {
  const [active, setActive] = useState('s01')

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }) },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const bd     = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  const bg     = dark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.85)'
  const bgCode = dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '196px 1fr', gap: 44, alignItems: 'start' }}>

      {/* ── Sidebar ── */}
      <div style={{ position: 'sticky', top: 24 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 18 }}>
          ENGINEERING NOTES
        </div>
        <nav>
          {SECTIONS.map(s => {
            const on = active === s.id
            return (
              <button key={s.id} onClick={() => scrollTo(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', textAlign: 'left',
                padding: '7px 10px', borderRadius: 7, marginBottom: 2,
                background: on ? 'rgba(16,185,129,0.08)' : 'none',
                border: `1px solid ${on ? 'rgba(16,185,129,0.22)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: on ? '#10b981' : 'var(--muted)', minWidth: 18, fontWeight: 700 }}>{s.num}</span>
                <span style={{ fontSize: 12, color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 600 : 400 }}>{s.label}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { v: '96%',    l: 'strong-match rate', c: '#10b981' },
            { v: '955',    l: 'active SKUs',        c: '#06b6d4' },
            { v: '<250ms', l: 'p95 latency',        c: '#a78bfa' },
            { v: '~30%',   l: 'LLM trigger rate',   c: '#f59e0b' },
          ].map(m => (
            <div key={m.l} style={{ padding: '9px 12px', borderRadius: 8, background: bg, border: `1px solid ${bd}` }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: m.c, fontFamily: 'var(--mono)', lineHeight: 1 }}>{m.v}</div>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div>

        {/* Hero */}
        <div style={{ marginBottom: 52 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 20,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#10b981', background: 'rgba(16,185,129,0.07)',
            border: '1px solid rgba(16,185,129,0.2)', padding: '5px 14px', borderRadius: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
            ENGINEERING NOTES · PARAGON PART MATCHING
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 42, fontWeight: 800, lineHeight: 1.12,
            color: 'var(--text)', marginBottom: 14, letterSpacing: '-0.01em',
          }}>
            Eight decisions.<br /><span style={{ color: '#10b981' }}>Each one earned.</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 560, lineHeight: 1.85 }}>
            These are not generic ML pipeline choices. They are the specific things I had to figure out
            to make part matching work for industrial fasteners — a domain where the vocabulary is proprietary,
            the queries are terse, and wrong results cost real money.
          </p>
        </div>

        <div style={{ height: 1, background: bd, marginBottom: 52 }} />

        {/* 01 */}
        <Section id="s01">
          <SectionHead num="01" title="The Semantic Gap" color="#10b981" />
          <Prose>
            <p>
              The same physical bolt can be described as{' '}
              <Chip label='"SHCS 1/2-13 x 2"' color="#10b981" />,{' '}
              <Chip label='"SOC HD CAP SCR 1/2 x 2 ZN"' color="#06b6d4" />,{' '}
              or <Chip label='"Socket Head Cap Screw 1/2" × 2" Zinc"' color="#a78bfa" /> — all referring to exactly
              the same SKU. There is no standardized industrial fastener vocabulary. Every buyer uses their own shorthand,
              every catalog uses its own format.
            </p>
            <br />
            <p>
              This breaks naive approaches in two specific ways. First, keyword search fails on abbreviations:
              a BM25 index that doesn't know <Chip label='"SHCS"' color="#f59e0b" /> means{' '}
              <Chip label='"socket head cap screw"' color="#f59e0b" /> will miss half of all queries.
              Second, semantic embeddings fail on dimensions: a vector model sees <Chip label='"1/2"' color="#ef4444" /> as
              a similar token in both "diameter = 1/2 inch" and "length = 1/2 inch" — it cannot resolve the structural
              difference without knowing what role each number plays.
            </p>
          </Prose>
          <Pull color="#10b981">
            The problem isn't finding parts — it's parsing what the buyer meant before you decide which parts to find.
          </Pull>
          <Prose>
            <p>
              The solution I landed on is to not treat this as a retrieval problem first. Before any candidate is
              fetched, the query goes through a domain-specific parser that extracts up to 8 typed attribute slots:
              family, diameter, thread pitch, length, material, finish, measurement system, and negative constraints.
              Only then does retrieval begin — now with structured knowledge of what the buyer actually asked for.
            </p>
          </Prose>
        </Section>

        {/* 02 */}
        <Section id="s02">
          <SectionHead num="02" title="Specificity First" color="#06b6d4" />
          <Prose>
            <p>
              Specificity is the central primitive I built the whole system around. It's a simple number:
              the fraction of the 8 possible attribute slots that the parser was able to fill from the query.
              A query like <Chip label='"M8 x 50mm BHCS alloy black oxide"' color="#10b981" /> fills 5 slots → specificity = 0.625.
              A query like <Chip label='"a bolt"' color="#ef4444" /> fills 0 slots → specificity = 0.0.
            </p>
          </Prose>
          <Pull color="#06b6d4">
            Specificity answers a question that confidence alone can't: not "how good is this match?" but "how well did we understand the query?"
          </Pull>
          <Prose>
            <p>Specificity drives three separate decisions in the pipeline:</p>
          </Prose>

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { gate: 'Early rejection', rule: 'specificity = 0.0 → return empty immediately', why: 'No attributes recognized means we understood nothing. An embedding similarity score on "a bolt" is meaningless. This also saves the API cost of the embedding call.', c: '#ef4444' },
              { gate: 'LLM trigger',     rule: 'specificity < 0.17 → always call GPT-4o-mini', why: '0.17 means fewer than 1.5 attributes on average. The rubric scorer needs attribute matches to differentiate candidates — below this threshold, LLM judgment is more reliable than the rubric.', c: '#f59e0b' },
              { gate: 'Confidence cap',  rule: 'cap = 0.58 + 0.37 × specificity', why: 'A vague query cannot produce a STRONG MATCH even if cosine similarity is 0.99. The cap enforces that confidence reflects understanding, not just text overlap.', c: '#10b981' },
            ].map(r => (
              <div key={r.gate} style={{ padding: '14px 18px', borderRadius: 10, background: bg, border: `1px solid ${bd}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: r.c, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.gate}</span>
                  <code style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', background: bgCode, padding: '1px 7px', borderRadius: 4 }}>{r.rule}</code>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.75 }}>{r.why}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 03 */}
        <Section id="s03">
          <SectionHead num="03" title="Two Retrievers" color="#a78bfa" />
          <Prose>
            <p>
              I use two retrieval methods, but not because "hybrid retrieval" is best practice — because each one covers
              a specific failure mode that the other can't handle.
            </p>
          </Prose>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ padding: '18px 20px', borderRadius: 11, background: bg, border: `1px solid rgba(16,185,129,0.2)` }}>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>BM25 — exact vocabulary</div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 12 }}>
                Industrial abbreviations like <Chip label='"SHCS"' color="#10b981" />, <Chip label='"BHCS"' color="#10b981" />, <Chip label='"HHB"' color="#10b981" /> are
                proprietary shorthand. General-purpose embeddings don't reliably map these to their full names.
                BM25 matches them exactly — if the catalog entry contains "SHCS" and the query says "SHCS", BM25 scores it high.
              </p>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                Without BM25: part-number queries like "7/16-14 SHCS" would rely entirely on semantic similarity, which is unreliable for proprietary codes.
              </div>
            </div>

            <div style={{ padding: '18px 20px', borderRadius: 11, background: bg, border: `1px solid rgba(167,139,250,0.2)` }}>
              <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Cosine — paraphrase recall</div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 12 }}>
                A buyer who types <Chip label='"hex head cap screw"' color="#a78bfa" /> instead of <Chip label='"HHCS"' color="#a78bfa" /> gets
                no BM25 benefit. The embedding model maps both phrases to similar vectors — semantic recall handles
                natural-language variation that keyword search misses entirely.
              </p>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                Without embeddings: descriptive queries like "flat head machine screw zinc plated" would fail on any catalog that uses abbreviations.
              </div>
            </div>
          </div>

          <Prose>
            <p style={{ marginTop: 20 }}>
              The two lists are merged with Reciprocal Rank Fusion (k=60): each candidate's score is{' '}
              <code style={{ fontFamily: 'var(--mono)', fontSize: 12, background: bgCode, padding: '1px 6px', borderRadius: 4, color: 'var(--text)' }}>Σ 1/(60 + rank)</code>.
              I chose RRF over score-based fusion specifically because BM25 scores are integers and cosine scores
              are 0–1 floats — combining them directly would require calibration that I'd have to re-tune on every
              catalog update. RRF is rank-based, so the scale mismatch is irrelevant.
            </p>
          </Prose>

          <InlineBox title="WHY NOT A VECTOR DATABASE?" color="#a78bfa" dark={dark}>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.75 }}>
              At 955 SKUs, all embeddings fit in a NumPy array in memory (~6MB). A vector DB like Pinecone adds
              network latency, operational complexity, and a monthly bill — in exchange for scaling to millions
              of vectors that this catalog will never reach. The right tool for 955 rows is a numpy dot product.
            </p>
          </InlineBox>
        </Section>

        {/* 04 */}
        <Section id="s04">
          <SectionHead num="04" title={'Teaching "Match"'} color="#f59e0b" />
          <Prose>
            <p>
              After retrieval, the top-20 candidates go through a 100-point attribute rubric. The point values are not arbitrary — each one encodes a judgment about how much that attribute matters for procurement correctness.
            </p>
          </Prose>

          <div style={{ marginTop: 20, padding: '18px 22px', borderRadius: 11, background: bg, border: `1px solid ${bd}` }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>ATTRIBUTE WEIGHTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { attr: 'Family', pts: 30, note: 'Hard filter — a hex bolt cannot substitute a socket head cap screw regardless of other matches', bar: '#10b981' },
                { attr: 'Thread', pts: 25, note: 'Wrong thread diameter = physically incompatible. Second-most important structural constraint.', bar: '#06b6d4' },
                { attr: 'Length', pts: 20, note: 'Structural requirement. A bolt that\'s too short won\'t work, too long may interfere.', bar: '#a78bfa' },
                { attr: 'Material', pts: 10, note: 'Important but substitutable in some cases (alloy → stainless is usually acceptable).', bar: '#f59e0b' },
                { attr: 'Finish', pts:  5, note: 'Cosmetic in most applications. Zinc vs. plain is buyer preference, not structural.', bar: '#f59e0b' },
                { attr: 'Standard', pts: 5, note: 'DIN/ISO/ANSI designations rarely specified in buyer queries. Tiebreaker only.', bar: '#6b7a8d' },
                { attr: 'Negatives', pts: -50, note: '"No zinc" or "not stainless" — 50-point penalty effectively disqualifies the match', bar: '#ef4444' },
              ].map(r => (
                <div key={r.attr} style={{ display: 'grid', gridTemplateColumns: '70px 46px 1fr', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{r.attr}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: r.pts < 0 ? '#ef4444' : r.bar, fontWeight: 700 }}>
                    {r.pts > 0 ? `+${r.pts}` : r.pts}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{r.note}</span>
                </div>
              ))}
            </div>
          </div>

          <Pull color="#f59e0b">
            The −50 for negative constraints is deliberate. It's large enough to disqualify any match, but not infinite — so violating candidates still rank among themselves for debugging.
          </Pull>

          <Prose>
            <p>
              Each attribute also has a status beyond pass/fail:{' '}
              <Chip label="exact" color="#10b981" />,{' '}
              <Chip label="compatible" color="#06b6d4" />,{' '}
              <Chip label="mismatch" color="#ef4444" />, or{' '}
              <Chip label="not_in_catalog" color="#6b7a8d" />.
              These show in the result card breakdown so a buyer can see exactly why a result was ranked first — not just a confidence number, but which attributes matched and which didn't.
            </p>
          </Prose>
        </Section>

        {/* 05 */}
        <Section id="s05">
          <SectionHead num="05" title="When to Ask GPT" color="#10b981" />
          <Prose>
            <p>
              The LLM reranker fires on two specific conditions. I chose both thresholds by thinking about where
              the rubric scorer genuinely fails — not just where it's "less accurate."
            </p>
          </Prose>

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '16px 20px', borderRadius: 10, background: bg, border: `1px solid rgba(16,185,129,0.2)` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Condition A</span>
                <code style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text)', background: bgCode, padding: '2px 8px', borderRadius: 4 }}>top-2 score gap &lt; 10%</code>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                When two candidates score within 10 points of each other, the rubric is genuinely uncertain — both parts
                are structurally similar to what the buyer asked for. This is exactly the case where LLM judgment about
                the query's real intent is more valuable than incrementally more rubric computation.
              </p>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: 10, background: bg, border: `1px solid rgba(245,158,11,0.2)` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Condition B</span>
                <code style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text)', background: bgCode, padding: '2px 8px', borderRadius: 4 }}>specificity &lt; 0.17</code>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                0.17 corresponds to roughly 1 attribute recognized. When the parser understood almost nothing, the
                rubric scorer can't meaningfully differentiate candidates — they all have mostly-empty attribute
                slots. The LLM, reading the raw query string directly, can often infer intent that the parser missed.
              </p>
            </div>
          </div>

          <Prose>
            <p style={{ marginTop: 20 }}>
              These two conditions trigger on roughly 30% of queries. The other 70% return the rubric's top-3
              directly — 800ms saved and ~$0.0015 saved per query. GPT-4o-mini writes a plain-English reason
              string (<em>"M8 thread matches exactly; length is 48mm vs 50mm requested — close but not exact"</em>)
              that surfaces in the result card so buyers know why the LLM picked what it picked.
            </p>
          </Prose>
        </Section>

        {/* 06 */}
        <Section id="s06">
          <SectionHead num="06" title="History as Signal" color="#a78bfa" />
          <Prose>
            <p>
              Repeat industrial buyers don't search in a vacuum. They have established suppliers, preferred materials,
              and habitual specifications. Ignoring that context means making them re-specify things they've already told you.
            </p>
          </Prose>

          <Pull color="#a78bfa">
            Personalization in this system is not a ranking feature. It's a disambiguation layer for queries where the catalog can't tell the difference.
          </Pull>

          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InlineBox title="REFERENTIAL QUERIES — BYPASS RETRIEVAL ENTIRELY" color="#a78bfa" dark={dark}>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                When a buyer types <Chip label='"the same washers as last time"' color="#a78bfa" />, there is no attribute to parse and no embedding
                to compare. The correct answer is in their order history, not the catalog. These queries are
                detected before the parser runs and resolved by looking up matching catalog descriptions in
                the customer's recent orders. This path has no embedding cost and returns in under 10ms.
              </p>
            </InlineBox>

            <InlineBox title="PREFERENCE BOOST — POST-SCORING, NOT PRE-FILTERING" color="#06b6d4" dark={dark}>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                Customer preference profiles (top materials, finishes, metric/imperial ratio) add a small score
                boost <em>after</em> the rubric has already ranked candidates. This is intentional: personalization
                should reinforce correct results, not override them. A customer who prefers zinc finish cannot
                cause a wrong-family part to rank first — the rubric handles correctness, personalization
                handles preference within correct results.
              </p>
            </InlineBox>

            <InlineBox title="CONFLICT DETECTION — WARN, DON'T SUPPRESS" color="#f59e0b" dark={dark}>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                If a buyer who always orders metric submits a query that resolves to an imperial part, the system
                surfaces a conflict warning rather than silently returning the result. Suppressing the result
                would be paternalistic — the buyer might deliberately want an imperial part this time. Surfacing
                the conflict respects their intent while preventing silent specification errors.
              </p>
            </InlineBox>
          </div>
        </Section>

        {/* 07 */}
        <Section id="s07">
          <SectionHead num="07" title="Honest Confidence" color="#f59e0b" />
          <Prose>
            <p>
              The hardest problem in the UI layer is making confidence numbers mean something. Raw cosine similarity
              between a vague query and a catalog entry can be 0.85 — which would normally imply a strong match.
              But if the query only had one recognizable attribute, that 0.85 means almost nothing.
            </p>
          </Prose>

          <Formula dark={dark} />

          <Prose>
            <p style={{ marginTop: 20 }}>
              The 0.58 floor means even a zero-specificity query can produce a result — but only at POSSIBLE confidence.
              The 0.37 slope means a buyer who specifies 4 of 8 attributes can reach LIKELY but not STRONG.
              Full STRONG MATCH confidence requires near-complete attribute coverage <em>and</em> high structural similarity.
            </p>
          </Prose>

          <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 10, background: bg, border: `1px solid ${bd}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>CONFIDENCE LABELS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'STRONG MATCH', range: '≥ 85%', note: 'High attribute coverage + high structural similarity. Buyer can proceed with confidence.', c: '#10b981' },
                { label: 'LIKELY',       range: '≥ 65%', note: 'Most attributes match. Minor uncertainty — buyer should verify one or two specs.', c: '#06b6d4' },
                { label: 'POSSIBLE',     range: '≥ 45%', note: 'Partial match. Could be correct but the query was underspecified. Flag for review.', c: '#f59e0b' },
                { label: 'REVIEW',       range: '< 45%', note: 'Low confidence. Auto-logged to review queue for human inspection.', c: '#ef4444' },
              ].map(r => (
                <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '120px 54px 1fr', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: r.c, fontFamily: 'var(--mono)' }}>{r.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{r.range}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{r.note}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 08 */}
        <Section id="s08">
          <SectionHead num="08" title="What I'd Build Next" color="#ef4444" />
          <Prose>
            <p>
              Honest limitations are more useful than polished claims. Here's what this system currently can't do
              and what I'd prioritize with more time.
            </p>
          </Prose>

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              {
                title: 'The parser misses non-standard abbreviations',
                detail: 'The regex rules cover the most common industrial abbreviations, but not all of them. "FHS" (flat head screw), "PHM" (pan head machine screw), and regional variants aren\'t in the current rule set. A small training set of real queries would let me extend the parser significantly.',
                next: 'Collect 200 real buyer queries and use them to extend the heuristic rules — no LLM needed for this.',
                c: '#ef4444',
              },
              {
                title: 'Personalization profiles thin out for new customers',
                detail: 'Customers with fewer than ~10 orders get a "sparse" flag and receive no personalization boost. This is correct behavior — inferring preferences from 2 orders would introduce more noise than signal — but it means new customers don\'t benefit from the history layer.',
                next: 'Category-level priors: if a customer orders mostly metric, default new metric customers to the metric-preferring prior until enough data accumulates.',
                c: '#f59e0b',
              },
              {
                title: 'The catalog preprocessing step requires a restart',
                detail: 'Adding new SKUs to the catalog requires re-running the preprocessing pipeline and restarting the server. For a catalog that changes daily, this is too slow. For 955 SKUs that change monthly, it\'s fine — but it\'s a ceiling.',
                next: 'Incremental embedding updates: write new catalog entries to disk and hot-reload the NumPy array without a full restart.',
                c: '#a78bfa',
              },
              {
                title: 'No multi-attribute disambiguation flow',
                detail: 'When a query is genuinely ambiguous — "1/2 bolt" could be dozens of SKUs — the system returns its best guess with low confidence rather than asking a follow-up question. In a real product, a conversational clarification step ("Did you mean metric or imperial? Socket head or hex?") would reduce re-queries.',
                next: 'A structured clarification prompt triggered when specificity < 0.25 and the review queue auto-logs the interaction for training data.',
                c: '#06b6d4',
              },
            ].map(r => (
              <div key={r.title} style={{ padding: '18px 20px', borderRadius: 11, background: bg, border: `1px solid ${bd}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.title}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 12 }}>{r.detail}</p>
                <div style={{ borderLeft: `2px solid ${r.c}40`, paddingLeft: 12, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.65 }}>
                  <span style={{ color: r.c, fontStyle: 'normal', fontWeight: 600 }}>Next step: </span>{r.next}
                </div>
              </div>
            ))}
          </div>

          {/* Eval note */}
          <div style={{ marginTop: 32, padding: '16px 20px', background: bg, border: `1px solid ${bd}`, borderRadius: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.85 }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Eval methodology: </span>
            33 hand-authored queries across 6 categories — exact spec, vague, referential, nonsensical, edge case (negatives + metric/imperial clash), and cross-family — were run against the full pipeline. Each result was graded strong / likely / possible / no-match by hand. 96% of queries with at least one recognized fastener attribute returned a strong-match top result. Nonsensical queries returned empty by design.
          </div>
        </Section>

      </div>
    </div>
  )
}
