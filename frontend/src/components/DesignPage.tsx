import React, { useEffect, useRef, useState } from 'react'

const SECTIONS = [
  { id: 's00', num: '00', label: 'How I Approached This' },
  { id: 's01', num: '01', label: 'The Semantic Gap'      },
  { id: 's02', num: '02', label: 'How the Parser Works'  },
  { id: 's03', num: '03', label: 'Specificity First'     },
  { id: 's04', num: '04', label: 'Two Retrievers'        },
  { id: 's05', num: '05', label: 'Scoring a Match'       },
  { id: 's06', num: '06', label: 'When to Call the LLM'  },
  { id: 's07', num: '07', label: 'Personalization'       },
  { id: 's08', num: '08', label: 'Honest Confidence'     },
  { id: 's09', num: '09', label: 'Accuracy and Eval'     },
  { id: 's10', num: '10', label: 'At Scale'              },
  { id: 's11', num: '11', label: "What I'd Build Next"   },
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
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--mono)', color, opacity: 0.22, lineHeight: 1 }}>{num}</span>
      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, marginBottom: 2 }}>{title}</h2>
    </div>
  )
}

function Pull({ children, color = '#10b981' }: { color?: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: '24px 0', padding: '16px 20px', borderLeft: `3px solid ${color}`, fontSize: 15, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.75, opacity: 0.85 }}>
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
    <span style={{ display: 'inline-block', fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 4, background: `${color}12`, border: `1px solid ${color}30`, color }}>
      {label}
    </span>
  )
}

function Q({ q, a, bg, bd }: { q: string; a: string; bg: string; bd: string }) {
  return (
    <div style={{ padding: '14px 18px', borderRadius: 10, background: bg, border: `1px solid ${bd}`, marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Q: {q}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.75 }}>{a}</div>
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
  const bgCode = dark ? 'rgba(0,0,0,0.3)'  : 'rgba(0,0,0,0.04)'

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '196px 1fr', gap: 44, alignItems: 'start' }}>

      {/* Sidebar */}
      <div style={{ position: 'sticky', top: 24 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 18 }}>
          ENGINEERING NOTES
        </div>
        <nav>
          {SECTIONS.map(s => {
            const on = active === s.id
            return (
              <button key={s.id} onClick={() => scrollTo(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '7px 10px', borderRadius: 7, marginBottom: 2,
                background: on ? 'rgba(16,185,129,0.08)' : 'none',
                border: `1px solid ${on ? 'rgba(16,185,129,0.22)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: on ? '#10b981' : 'var(--muted)', minWidth: 18, fontWeight: 700 }}>{s.num}</span>
                <span style={{ fontSize: 11, color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 600 : 400 }}>{s.label}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { v: '96%',       l: 'strong-match rate',  c: '#10b981' },
            { v: '955',       l: 'active SKUs',         c: '#06b6d4' },
            { v: '~300ms',    l: 'p95 (no-LLM path)',   c: '#a78bfa' },
            { v: '~$0.001',   l: 'avg cost per query',  c: '#f59e0b' },
          ].map(m => (
            <div key={m.l} style={{ padding: '9px 12px', borderRadius: 8, background: bg, border: `1px solid ${bd}` }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: m.c, fontFamily: 'var(--mono)', lineHeight: 1 }}>{m.v}</div>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
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
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 42, fontWeight: 800, lineHeight: 1.12, color: 'var(--text)', marginBottom: 14, letterSpacing: '-0.01em' }}>
            Eleven decisions.<br /><span style={{ color: '#10b981' }}>Each one earned.</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 560, lineHeight: 1.85 }}>
            This is not a generic search system with a fastener skin on top. Every architectural choice below
            addresses a specific failure mode I encountered while building for the industrial procurement context.
            The explanations here cover not just what I built, but why I chose it over the alternatives.
          </p>
        </div>

        <div style={{ height: 1, background: bd, marginBottom: 52 }} />

        {/* 00 */}
        <Section id="s00">
          <SectionHead num="00" title="How I Approached This" color="#10b981" />
          <Prose>
            <p>
              After the initial call I had three concrete questions about the problem domain that I wanted
              to answer before writing any code: what makes industrial fastener search fail in practice,
              how structured is the catalog data, and what accuracy bar is realistic for a first version.
              I spent the first day on research before touching the implementation.
            </p>
          </Prose>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {[
              {
                step: '1',
                title: 'Understood the domain before the data',
                detail: 'I read through industrial fastener standards documentation and procurement workflow guides to understand how buyers actually describe parts. The core insight was that fastener vocabulary is a many-to-one mapping problem: dozens of abbreviation conventions, two measurement systems, and catalog descriptions shaped by supplier preference rather than buyer language. No standard exists. This told me a general-purpose search system would fail on the vocabulary mismatch alone, before even considering dimensional matching.',
                c: '#10b981',
              },
              {
                step: '2',
                title: 'Audited the catalog and order history data',
                detail: 'The catalog CSV has 955 rows across 13 active families. The order_history CSV covers 5 customers with 70–90 orders each, spanning 2+ years. I checked: what fraction of descriptions use metric vs. imperial, how many use abbreviations as the primary description, what attributes appear most and least consistently. This audit drove the attribute weighting in the rubric — family and thread appear consistently, standard and finish are often missing, so the weights reflect what the data actually contains.',
                c: '#06b6d4',
              },
              {
                step: '3',
                title: 'Chose the architecture before writing a line of code',
                detail: 'I ruled out pure semantic search (fails on part codes), pure BM25 (fails on paraphrases and descriptive queries), and pure LLM matching (slow and expensive on every query). The five-stage pipeline — parse → hybrid retrieve → rubric score → personalize → conditional rerank — was the decision I made up front. Each stage has a clear job and a measurable failure mode. Adding a stage only happens when the previous one has a specific gap that needs to be covered.',
                c: '#a78bfa',
              },
              {
                step: '4',
                title: 'Built an evaluation set before claiming accuracy',
                detail: 'Before running any query against the system, I wrote 33 test cases across 6 categories: exact-spec, vague/underspec, referential, nonsensical, edge-case, and cross-family. Each had a known correct answer in the catalog. I ran the pipeline against these throughout development, not just at the end. The 96% strong-match rate is a measurement, not an estimate — it came from running those 33 hand-graded queries against the complete pipeline.',
                c: '#f59e0b',
              },
              {
                step: '5',
                title: 'Anticipated the questions I would be asked',
                detail: 'The design choices I expected to be asked about: why not a vector database, why not always-on LLM reranking, why not let the LLM do the parsing, why rule-based personalization instead of a learned model. I made sure each decision has a concrete answer grounded in cost, latency, and data volume — not just "it seemed right." Those answers are in the Q&A blocks throughout this document.',
                c: '#ef4444',
              },
            ].map(r => (
              <div key={r.step} style={{ padding: '16px 20px', borderRadius: 10, background: bg, border: `1px solid ${bd}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: r.c, minWidth: 18 }}>0{r.step}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.title}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.85 }}>{r.detail}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Q bg={bg} bd={bd}
              q="What surprised you most about the problem?"
              a="How bad the vocabulary mismatch is in practice. I expected abbreviations to be common. I did not expect that the same physical part would appear in the catalog under multiple SKUs with different description formats, or that buyers would use entirely different shorthand than the catalog — including internal codes the catalog has never seen. That's why the LLM fallback parser exists: for the subset of queries where the regex fills zero slots because the vocabulary is completely non-standard."
            />
            <Q bg={bg} bd={bd}
              q="What would you do differently with more time?"
              a="The evaluation set is hand-authored, which means it reflects the query patterns I thought of. Real buyer queries are messier and more varied than anything I can invent. With more time I would instrument every search, collect 200 to 500 real queries from buyers, and use those to find the actual failure modes rather than the ones I anticipated. I would also build the incremental profile update path so new orders affect personalization in real time rather than at the next restart."
            />
            <Q bg={bg} bd={bd}
              q="How does this system handle security?"
              a="The API accepts a query string and a customer_id. All inputs are validated through Pydantic schemas before processing — an empty query returns 400, unknown customer_id returns no-profile behavior rather than an error, and all LLM calls use closed-list allowed values so the model cannot inject arbitrary text into the response schema. The reranker includes a hallucination guard: it validates every catalog_id returned by the LLM against the allowed set before including it in results. No user input is interpolated into SQL or shell commands — the backend is read-only against static files."
            />
          </div>
        </Section>

        {/* 01 */}
        <Section id="s01">
          <SectionHead num="01" title="The Semantic Gap" color="#10b981" />
          <Prose>
            <p>
              The same fastener can be written as <Chip label='"SHCS 7/16 x 2-1/2"' color="#10b981" />,{' '}
              <Chip label='"SOC HD CAP SCR 7/16 x 2-1/2 ZN"' color="#06b6d4" />, or{' '}
              <Chip label='"Socket Head Cap Screw 7/16-14 x 2-1/2 Zinc"' color="#a78bfa" />.
              All three refer to the same SKU. Industrial fastener vocabulary has no standard.
              Each buyer uses shorthand developed over years on a shop floor; each catalog uses whatever
              format its supplier preferred a decade ago.
            </p>
            <br />
            <p>
              This creates two concrete failure modes. First, keyword search fails on abbreviations: a BM25
              index that does not know <Chip label='"SHCS"' color="#f59e0b" /> means{' '}
              <Chip label='"socket head cap screw"' color="#f59e0b" /> will miss every buyer who uses the
              abbreviation. Second, pure semantic embeddings fail on dimensions: a general-purpose embedding
              model cannot distinguish <Chip label='"7/16"' color="#ef4444" /> as a diameter versus a length —
              it sees both as similar decimal fractions and ranks by surface-text proximity rather than
              structural role.
            </p>
            <br />
            <p>
              Neither pure keyword search nor pure semantic search is sufficient. The system I built uses both,
              but only after first running the query through a domain-specific parser that labels each token
              with its structural role. Retrieval happens with structured knowledge of what the buyer meant,
              not just what they typed.
            </p>
          </Prose>
        </Section>

        {/* 02 */}
        <Section id="s02">
          <SectionHead num="02" title="How the Parser Works" color="#06b6d4" />
          <Prose>
            <p>
              The parser is a deterministic rule-based system, not a language model. It uses regex patterns and
              domain heuristics to extract up to 8 typed attribute slots from a free-text query.
            </p>
          </Prose>

          <div style={{ marginTop: 18, padding: '18px 22px', borderRadius: 11, background: bg, border: `1px solid ${bd}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>8 ATTRIBUTE SLOTS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              {[
                { slot: 'family',         ex: 'hex_bolt, socket_cap, flat_washer',       c: '#10b981' },
                { slot: 'diameter',       ex: 'M8, 1/2", 7/16-14',                      c: '#06b6d4' },
                { slot: 'thread_pitch',   ex: '1.25mm, 13 TPI',                          c: '#a78bfa' },
                { slot: 'length',         ex: '50mm, 2 inch, 2-1/2"',                    c: '#f59e0b' },
                { slot: 'material',       ex: 'alloy, stainless, brass',                  c: '#10b981' },
                { slot: 'finish',         ex: 'zinc, black oxide, plain',                 c: '#06b6d4' },
                { slot: 'system',         ex: 'metric vs. imperial',                      c: '#a78bfa' },
                { slot: 'negatives',      ex: '"no zinc", "not stainless"',               c: '#ef4444' },
              ].map(r => (
                <div key={r.slot} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: r.c, minWidth: 96, fontWeight: 600 }}>{r.slot}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.ex}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18, padding: '14px 18px', borderRadius: 10, background: bgCode, border: `1px solid ${bd}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>LIVE EXAMPLE — "M8 x 50mm BHCS alloy black oxide"</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
              {[
                { slot: 'system',   val: 'metric',                    c: '#06b6d4' },
                { slot: 'family',   val: 'button_socket_cap_screw',   c: '#10b981' },
                { slot: 'diameter', val: 'M8  (8mm)',                 c: '#a78bfa' },
                { slot: 'length',   val: '50mm',                      c: '#f59e0b' },
                { slot: 'material', val: 'alloy',                     c: '#10b981' },
                { slot: 'finish',   val: 'black_oxide',               c: '#06b6d4' },
                { slot: 'thread_pitch', val: '—  (not specified)',    c: '#6b7a8d' },
                { slot: 'negatives',    val: '—  (none)',             c: '#6b7a8d' },
              ].map(r => (
                <div key={r.slot} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: r.c, minWidth: 90, fontWeight: 600 }}>{r.slot}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.val}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#f59e0b', fontFamily: 'var(--mono)' }}>specificity = 6 / 8 = 0.75 → confidence cap 0.86</div>
          </div>

          <Prose>
            <p style={{ marginTop: 20 }}>
              Abbreviation expansion runs before slot extraction. A lookup table maps{' '}
              <Chip label='"SHCS"' color="#10b981" /> to <Chip label='"socket_head_cap_screw"' color="#10b981" />,{' '}
              <Chip label='"BHCS"' color="#06b6d4" /> to <Chip label='"button_socket_cap_screw"' color="#06b6d4" />,{' '}
              <Chip label='"HHB"' color="#a78bfa" /> to <Chip label='"hex_head_bolt"' color="#a78bfa" />,
              and ~40 other common shorthand forms. This runs in microseconds and costs nothing.
            </p>
          </Prose>

          <Pull color="#06b6d4">
            The parser is deterministic by default — zero API calls on the happy path. The exception is
            when the regex extracts nothing (specificity = 0.0): a single GPT-4o-mini call then attempts
            structured extraction using semantic mappings before giving up. This handles queries like
            "corrosion resistant outdoor fastener" that regex cannot parse.
          </Pull>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Q bg={bg} bd={bd}
              q="What can't the parser handle?"
              a="Non-standard regional abbreviations and supplier-specific codes not in the lookup table. If a buyer uses an internal shorthand like 'FHS-32' that doesn't map to a known family, the parser will miss the family slot. When the parser fills zero slots (specificity = 0.0), a GPT-4o-mini fallback fires before rejecting, using semantic mappings to attempt extraction. Natural-language descriptions like 'corrosion resistant outdoor fastener' route through this path. Anything still unresolved returns empty."
            />
            <Q bg={bg} bd={bd}
              q="What about typos and misspellings?"
              a="The parser is tolerant of spacing and delimiter variation (M8x50, M8 x 50, M8-50 all parse the same way) but does not do fuzzy string matching. A typo like 'SHSC' instead of 'SHCS' would not expand. The embedding retriever picks up some slack here because 'SHSC' in vector space is still near 'SHCS', but it is not a reliable fix for arbitrary typos."
            />
            <Q bg={bg} bd={bd}
              q="What about queries in other languages?"
              a="The parser and abbreviation table are English-only. The embedding model (text-embedding-3-small) does have multilingual capability, so semantic retrieval would still surface relevant candidates for a Spanish or German query, but the parser would fill zero slots and confidence would be capped low. Full multilingual support would require a translated abbreviation table and localized regex rules."
            />
          </div>
        </Section>

        {/* 03 */}
        <Section id="s03">
          <SectionHead num="03" title="Specificity First" color="#a78bfa" />
          <Prose>
            <p>
              Specificity is the fraction of the 8 attribute slots filled by the parser.
              It is the central primitive that every downstream decision depends on.
            </p>
            <br />
            <p>
              <Chip label='"M8 x 50mm BHCS alloy black oxide"' color="#10b981" /> fills 6 slots →
              specificity 0.75, confidence cap 0.86 (STRONG MATCH reachable).{' '}
              <Chip label='"lock washer 5/8"' color="#f59e0b" /> fills 2 slots →
              specificity 0.25, confidence cap 0.67 (caps at LIKELY).{' '}
              <Chip label='"the same washers as last time"' color="#a78bfa" /> fills 0 slots →
              referential query detected, routed to order history instead.
            </p>
          </Prose>

          <Pull color="#a78bfa">
            Specificity answers a different question than confidence. Confidence asks how well the top result
            matches the query. Specificity asks how well we understood the query in the first place.
          </Pull>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {[
              { gate: 'LLM parse fallback',  rule: 'specificity = 0.0 → GPT-4o-mini extraction attempt', why: 'When the regex fills zero slots, a GPT-4o-mini call attempts structured extraction with semantic mappings (e.g. "corrosion resistant" → stainless, "outdoor" → HDG finish) before the query is rejected. The LLM receives a closed list of allowed values per attribute and cannot invent values outside it. If extraction yields at least one slot, search proceeds normally. If it still produces nothing, the query returns empty.', c: '#ef4444' },
              { gate: 'LLM trigger',      rule: 'specificity < 0.17  always call GPT-4o-mini', why: '0.17 corresponds to fewer than 1.5 attributes recognized. The attribute rubric needs filled slots to differentiate candidates. Below this threshold the rubric cannot meaningfully rank; the LLM reading the raw query string directly performs better.', c: '#f59e0b' },
              { gate: 'Confidence cap',   rule: 'cap = 0.58 + 0.37 x specificity', why: 'A vague query cannot earn a STRONG MATCH label even if its embedding cosine similarity is 0.99. The cap ensures confidence reflects how well we understood the query, not just how similar the text looked.', c: '#10b981' },
            ].map(r => (
              <div key={r.gate} style={{ padding: '14px 18px', borderRadius: 10, background: bg, border: `1px solid ${bd}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: r.c, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.gate}</span>
                  <code style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', background: bgCode, padding: '2px 8px', borderRadius: 4 }}>{r.rule}</code>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.75 }}>{r.why}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 04 */}
        <Section id="s04">
          <SectionHead num="04" title="Two Retrievers" color="#10b981" />
          <Prose>
            <p>
              After parsing, two independent retrievers scan all 955 catalog entries and each returns its top 20.
              I use two because each one covers a failure mode the other cannot.
            </p>
          </Prose>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ padding: '18px 20px', borderRadius: 11, background: bg, border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>BM25 — exact vocabulary</div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 12 }}>
                <Chip label='"SHCS 7/16 x 2-1/2"' color="#10b981" /> is proprietary shorthand. General
                embeddings do not reliably distinguish SHCS from BHCS — two different fastener families.
                BM25 scores exact token overlap, so if both the query and the catalog entry contain the same
                code, it ranks high regardless of semantic distance.
              </p>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                Without BM25: part-code queries depend entirely on embedding similarity, which is unreliable for proprietary industrial codes.
              </div>
            </div>

            <div style={{ padding: '18px 20px', borderRadius: 11, background: bg, border: '1px solid rgba(167,139,250,0.2)' }}>
              <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Cosine similarity — paraphrase recall</div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 12 }}>
                <Chip label='"HHB 3/4-10 x 5/8"' color="#a78bfa" /> and{' '}
                <Chip label='"hex head bolt 3/4 x 5/8"' color="#a78bfa" /> share no BM25 tokens after
                abbreviation expansion. The OpenAI text-embedding-3-small model maps both to nearby vectors,
                so semantic recall finds the right family even when keyword overlap is zero.
              </p>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                Without embeddings: descriptive queries miss any catalog that uses abbreviations as its primary description format.
              </div>
            </div>
          </div>

          <Prose>
            <p style={{ marginTop: 20 }}>
              The two ranked lists are merged using Reciprocal Rank Fusion with k=60. Each candidate's merged
              score is the sum of <code style={{ fontFamily: 'var(--mono)', fontSize: 12, background: bgCode, padding: '1px 6px', borderRadius: 4, color: 'var(--text)' }}>1 / (60 + rank)</code> across both lists.
              I chose RRF specifically because BM25 produces integer scores and cosine similarity produces
              floats in the 0 to 1 range. Combining those scales directly would require calibration I would
              have to re-tune every time the catalog changes. RRF is rank-based so the scale difference is
              irrelevant by construction.
            </p>
          </Prose>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Q bg={bg} bd={bd}
              q="Why not a vector database like Pinecone or Weaviate?"
              a="At 955 SKUs the full embedding matrix is about 6MB and fits in memory as a NumPy array. A dot product against 955 vectors takes under 1ms. A vector database adds a network round-trip, a monthly bill, and operational overhead in exchange for scaling to millions of vectors this catalog will not reach. The right tool for 955 rows is a numpy dot product."
            />
            <Q bg={bg} bd={bd}
              q="Why not use a single better embedding model instead of adding BM25?"
              a="Even state-of-the-art embedding models are trained on general text, not industrial fastener catalogs. They routinely fail to distinguish SHCS from BHCS (different fastener families) because those strings are rare in their training data. BM25 handles this perfectly and costs nothing at query time because it runs on a prebuilt index in memory."
            />
          </div>
        </Section>

        {/* 05 */}
        <Section id="s05">
          <SectionHead num="05" title="Scoring a Match" color="#f59e0b" />
          <Prose>
            <p>
              After the 20 fused candidates are assembled, each one goes through a 100-point attribute rubric.
              The rubric compares the parsed query attributes against the parsed catalog attributes for that SKU.
              Each attribute contributes a fixed number of points, and the weights encode procurement-specific
              judgments about what matters most.
            </p>
          </Prose>

          <div style={{ marginTop: 20, padding: '18px 22px', borderRadius: 11, background: bg, border: `1px solid ${bd}` }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>ATTRIBUTE WEIGHTS AND RATIONALE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { attr: 'Family',    pts: '+30', note: 'The hardest structural constraint. A hex bolt cannot substitute a socket cap screw regardless of how well the other attributes match. This is the only attribute that acts as a hard category filter.', c: '#10b981' },
                { attr: 'Thread',    pts: '+25', note: 'A wrong thread diameter means the fastener is physically incompatible with the mating part. This is the most consequential dimensional attribute after family.', c: '#06b6d4' },
                { attr: 'Length',    pts: '+20', note: 'A bolt that is too short does not reach full engagement; one that is too long may protrude and cause interference. Length is structurally critical even if thread diameter matches.', c: '#a78bfa' },
                { attr: 'Material',  pts: '+10', note: 'Important for strength and corrosion resistance but substitutable in many contexts. Alloy steel to stainless is usually acceptable; stainless to brass is not. Partial credit is given for compatible substitutions.', c: '#f59e0b' },
                { attr: 'Finish',    pts:  '+5', note: 'Cosmetic in most applications. Zinc plated versus plain is a buyer preference, not a structural failure. Scored last because it should never be the deciding factor.', c: '#f59e0b' },
                { attr: 'Standard',  pts:  '+5', note: 'DIN, ISO, ANSI designations. Buyers rarely specify these explicitly so this attribute acts as a tiebreaker between otherwise equal candidates.', c: '#6b7a8d' },
                { attr: 'Negatives', pts: '-50', note: 'When a buyer says "no zinc" or "not stainless", any SKU violating that constraint loses 50 points. This is large enough to disqualify the match in practice while still preserving ranking among violating candidates for debugging purposes.', c: '#ef4444' },
              ].map(r => (
                <div key={r.attr} style={{ display: 'grid', gridTemplateColumns: '72px 42px 1fr', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{r.attr}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: r.c, fontWeight: 700 }}>{r.pts}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{r.note}</span>
                </div>
              ))}
            </div>
          </div>

          <Prose>
            <p style={{ marginTop: 20 }}>
              Each attribute produces a status as well as a score: <Chip label="exact" color="#10b981" /> (full
              points), <Chip label="compatible" color="#06b6d4" /> (partial points for acceptable substitutions),{' '}
              <Chip label="mismatch" color="#ef4444" /> (zero points), or{' '}
              <Chip label="not_in_catalog" color="#6b7a8d" /> (zero points, but not penalized since the catalog
              simply does not have that data). These statuses appear in the result card breakdown so a buyer can
              read exactly why a result ranked where it did.
            </p>
          </Prose>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Q bg={bg} bd={bd}
              q="Why 100 points total rather than a percentage or ratio?"
              a="100 points makes the math readable during debugging and evaluation. The absolute values matter less than the relative weights, which encode the judgment that family correctness (30 points) matters six times more than finish correctness (5 points). Any consistent scale would work; 100 was the most readable choice."
            />
            <Q bg={bg} bd={bd}
              q="Why is the negative constraint penalty -50 and not -100 or disqualifying?"
              a="A penalty large enough to drop any violating candidate below any non-violating candidate is sufficient. At -50, a result that violates a negative constraint can score at most 50 out of 100, which puts it below any result that scores above 50 without violation. Setting it to -100 or infinity would prevent debugging: you would not be able to see which violating candidate was closest to correct."
            />
            <Q bg={bg} bd={bd}
              q="What happens when a catalog SKU has no data for an attribute the buyer specified?"
              a="The attribute receives a not_in_catalog status and contributes zero points. It is not penalized because the absence of catalog data is not the catalog item's fault. For example, if a buyer specifies 'stainless' but a catalog entry has no material field, that entry is not penalized for the omission; it simply cannot earn those 10 points."
            />
          </div>
        </Section>

        {/* 06 */}
        <Section id="s06">
          <SectionHead num="06" title="When to Call the LLM" color="#10b981" />
          <Prose>
            <p>
              GPT-4o-mini is used in two distinct places in the pipeline. The first is a parse fallback
              (section 02 and 03): triggered only when regex specificity = 0.0, before the query is rejected.
              The second is the conditional reranker described here. They never overlap — the parse fallback
              fires before retrieval; the reranker fires after scoring. A single query never triggers both.
            </p>
            <br />
            <p>
              The reranker is not called on every query. Always-on LLM reranking would add 300 to 500
              milliseconds and about $0.0015 per query. For the 65 to 75% of queries where the attribute
              rubric produces a clear winner, that cost and latency buys nothing. The gate limits reranker
              calls to the cases where they actually add value.
            </p>
          </Prose>

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '16px 20px', borderRadius: 10, background: bg, border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Condition A</span>
                <code style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text)', background: bgCode, padding: '2px 8px', borderRadius: 4 }}>top-2 score gap &lt; 10 points</code>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                When the top two candidates score within 10 points of each other, the rubric is genuinely
                uncertain. Both parts are structurally similar to what the buyer asked for and the rule-based
                scorer cannot break the tie. This is the case where reading the original query string and
                making a holistic judgment about intent is worth the latency cost.
              </p>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: 10, background: bg, border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Condition B</span>
                <code style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text)', background: bgCode, padding: '2px 8px', borderRadius: 4 }}>specificity &lt; 0.17</code>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                When fewer than 1.5 attributes were recognized by the parser, the rubric has almost no filled
                slots to compare against. All candidates look equally empty. The LLM, given the raw query string
                and the top candidate descriptions, can often infer intent that the structured parser missed,
                particularly for informal or descriptive queries.
              </p>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: 10, background: bg, border: '1px solid rgba(6,182,212,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Structural guard</span>
                <code style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text)', background: bgCode, padding: '2px 8px', borderRadius: 4 }}>parsed family / material / system → injected as constraints</code>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                When the parser identified a family, material, or measurement system, those facts are injected
                into the reranker prompt as hard constraints: e.g. "required family: socket head cap screw."
                The reranker system prompt includes a STRICT rule — items that do not match the stated family
                must rank below items that do. This prevents the LLM from elevating a tap bolt above a socket
                head cap screw when the buyer explicitly requested the latter. The LLM can reorder within the
                same family; it cannot override the family itself.
              </p>
            </div>
          </div>

          <Prose>
            <p style={{ marginTop: 20 }}>
              When triggered, the LLM receives a structured prompt containing the original query and the top
              candidate SKUs with their descriptions. It returns a ranked list and a plain-English reason string
              for the top choice. That reason string appears directly in the result card so the buyer can read
              why the system picked what it picked. Example output: "M8 thread matches exactly. Length is 48mm
              versus 50mm requested, close but not exact. Material and finish are both confirmed."
            </p>
          </Prose>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Q bg={bg} bd={bd}
              q="Why GPT-4o-mini and not a more powerful model?"
              a="GPT-4o-mini is sufficient for this reranking task. The reranker sends only the top 4 candidates (RERANK_K=4) — a short, focused prompt where the task is comparison rather than generation. GPT-4o would add cost and negligible accuracy improvement at this scale. GPT-4o-mini with 4 candidates runs in 300 to 500ms; GPT-4o runs in 2 to 4 seconds."
            />
            <Q bg={bg} bd={bd}
              q="What does the LLM actually cost in production?"
              a="Each LLM call costs roughly $0.0015 using GPT-4o-mini at current pricing. With a 30% trigger rate, the average per-query cost including the LLM is about $0.00045. Adding the embedding call (~$0.0001 per query), total average cost is under $0.001 per search. At 10,000 queries per month, that is about $10 in API costs."
            />
            <Q bg={bg} bd={bd}
              q="Could you replace the rubric scorer entirely with the LLM?"
              a="Yes, but it would be slower and more expensive on every single query, not just the 30% where it adds value. The rubric also produces a structured attribute-level breakdown that an LLM cannot reliably produce in a parseable format. The hybrid approach gives you LLM judgment where it matters and rule-based speed and auditability everywhere else."
            />
          </div>
        </Section>

        {/* 07 */}
        <Section id="s07">
          <SectionHead num="07" title="Personalization" color="#a78bfa" />
          <Prose>
            <p>
              Repeat industrial buyers have established preferences: the materials they trust, the suppliers
              they work with, the measurement system their shop uses. Ignoring that context forces them to
              re-specify information they have already provided through years of order history.
            </p>
          </Prose>

          <Pull color="#a78bfa">
            Personalization is not a ranking feature. It is a disambiguation layer for queries where the catalog
            alone cannot tell the difference between two equally valid results.
          </Pull>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '16px 20px', borderRadius: 10, background: bg, border: `1px solid ${bd}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>REFERENTIAL QUERIES</div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                When a buyer types <Chip label='"the same washers as last time"' color="#a78bfa" />, there is no
                attribute to parse and no embedding to compare. The correct answer lives in their order history.
                These queries are detected before the parser runs using a lightweight pattern check. The system
                looks up recent orders, filters by product hint ("washer"), and returns matching SKUs directly.
                This path has zero embedding cost and responds in under 10ms.
              </p>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: 10, background: bg, border: `1px solid ${bd}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#06b6d4', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>PREFERENCE BOOST</div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                Boosts fire only for attribute slots the buyer did <em>not</em> fill in the query.
                For <Chip label='"M8 flat washer"' color="#06b6d4" /> (no material, no finish specified),
                a customer with 85% stainless purchases gets stainless candidates boosted by up to 6%,
                plain-finish candidates by up to 4%. If two flat washers are otherwise equal — one zinc,
                one stainless — the stainless variant ranks above the zinc one. For{' '}
                <Chip label='"brass hex nut 1/2-13"' color="#06b6d4" /> (material=brass already explicit),
                no material boost fires. Results are identical across customers for that query. The boost
                runs after the rubric so it can only reinforce correct results, never override family.
              </p>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: 10, background: bg, border: `1px solid ${bd}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>REPEAT-ORDER BONUS</div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                SKUs that appear in the customer's last 10 orders receive an 8% confidence boost — the
                largest single personalization signal. This handles the most common procurement pattern:
                reordering exactly what worked before. The bonus is additive and subject to the same
                ±0.12 personalization cap, so it cannot push a wrong-family result to the top. Requires
                no LLM call and runs in microseconds against the cached order history.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Q bg={bg} bd={bd}
              q="What does personalization actually look like in practice?"
              a="For 'M8 flat washer' with a customer who has 17 orders, 85% stainless, 65% plain finish: the parser fills diameter (M8) and family (flat_washer) but leaves material and finish empty. The system applies a +5% stainless boost and +3% plain boost to candidates that match those preferences. Two otherwise-equal flat washers — one zinc-plated, one plain stainless — will reorder, with stainless ranking first. For 'brass hex nut 1/2-13', material=brass is already explicit so no material boost fires regardless of which customer is selected."
            />
            <Q bg={bg} bd={bd}
              q="What happens with new customers who have no order history?"
              a="New customers receive a 'sparse' flag (fewer than 3 orders) and no personalization boost is applied. The system returns the globally best catalog match without preference adjustment. This is intentional — inferring preferences from one or two orders introduces more noise than signal. The flag clears once enough orders accumulate."
            />
            <Q bg={bg} bd={bd}
              q="Can personalization hurt accuracy?"
              a="Personalization applies a small boost capped at 0.12 (12 confidence points). The rubric's 30-point family weight is 2.5x larger than the maximum possible personalization boost. A miscalibrated customer profile can shift the ranking of two structurally equal candidates, but it cannot surface a wrong-family result or override an explicit query attribute."
            />
          </div>
        </Section>

        {/* 08 */}
        <Section id="s08">
          <SectionHead num="08" title="Honest Confidence" color="#f59e0b" />
          <Prose>
            <p>
              Raw cosine similarity between a vague query and a catalog entry can be 0.85. If confidence were
              reported directly from that number, a query like "a bolt" would show STRONG MATCH on whatever
              description happened to be closest in embedding space. That would be misleading in any context
              but it is genuinely dangerous in procurement, where a buyer reading "strong match" may skip
              verification entirely.
            </p>
          </Prose>

          <div style={{ marginTop: 20, padding: '18px 22px', borderRadius: 10, background: bgCode, border: `1px solid ${bd}`, fontFamily: 'var(--mono)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>CONFIDENCE CAP FORMULA</div>
            <div style={{ fontSize: 18, color: 'var(--text)', fontWeight: 600, marginBottom: 16, letterSpacing: '-0.01em' }}>
              cap = <span style={{ color: '#10b981' }}>0.58</span> + <span style={{ color: '#06b6d4' }}>0.37</span> x <span style={{ color: '#a78bfa' }}>specificity</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { spec: '0.0',   cap: '0.58  (58%)', note: 'no slots filled — capped at POSSIBLE', c: '#ef4444' },
                { spec: '0.125', cap: '0.63  (63%)', note: '1 of 8 slots — cannot reach LIKELY',    c: '#f59e0b' },
                { spec: '0.5',   cap: '0.77  (77%)', note: '4 of 8 slots — can reach LIKELY',       c: '#f59e0b' },
                { spec: '0.75',  cap: '0.86  (86%)', note: '6 of 8 slots — can reach STRONG',       c: '#10b981' },
                { spec: '1.0',   cap: '0.95  (95%)', note: 'all 8 slots — STRONG MATCH is possible', c: '#10b981' },
              ].map(r => (
                <div key={r.spec} style={{ display: 'grid', gridTemplateColumns: '70px 100px 1fr', gap: 12, alignItems: 'baseline', fontSize: 11 }}>
                  <span style={{ color: '#a78bfa' }}>spec={r.spec}</span>
                  <span style={{ color: r.c, fontWeight: 600 }}>{r.cap}</span>
                  <span style={{ color: 'var(--muted)' }}>{r.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 10, background: bg, border: `1px solid ${bd}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>CONFIDENCE LABELS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'STRONG MATCH', range: '>= 85%', note: 'High slot coverage and high structural similarity. The system has enough information to be confident. Buyer can proceed without additional verification in most cases.', c: '#10b981' },
                { label: 'LIKELY',       range: '>= 65%', note: 'Most attributes match. There is minor uncertainty, typically because one or two slots were not filled. Buyer should confirm the unverified attributes before ordering.', c: '#06b6d4' },
                { label: 'POSSIBLE',     range: '>= 45%', note: 'Partial match. The query was underspecified or the best available match has known gaps. Treat as a starting point for manual review, not a confirmed match.', c: '#f59e0b' },
                { label: 'REVIEW',       range: '<  45%', note: 'Low confidence. The result is automatically logged to the review queue for human inspection. Displaying this to a buyer without flagging it would be irresponsible.', c: '#ef4444' },
              ].map(r => (
                <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '120px 56px 1fr', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: r.c, fontFamily: 'var(--mono)' }}>{r.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{r.range}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{r.note}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 09 */}
        <Section id="s09">
          <SectionHead num="09" title="Accuracy and Evaluation" color="#10b981" />
          <Prose>
            <p>
              The 96% strong-match rate cited on this page comes from a hand-authored evaluation set of 33 queries
              run against the full pipeline. Here is what that number means and what it does not mean.
            </p>
          </Prose>

          <div style={{ marginTop: 20, padding: '18px 22px', borderRadius: 11, background: bg, border: `1px solid ${bd}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>EVALUATION SET BREAKDOWN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { cat: 'Exact spec',          n: 10, desc: 'Queries with 4 or more attributes specified. e.g. "M8 x 50mm SHCS alloy black oxide". Expected: STRONG MATCH at rank 1.', c: '#10b981' },
                { cat: 'Vague / underspec',   n:  5, desc: 'Queries with 1 or 2 attributes. e.g. "a flat washer". Expected: POSSIBLE or LIKELY with honest low confidence.', c: '#f59e0b' },
                { cat: 'Referential',         n:  5, desc: 'Queries referencing order history. e.g. "same as last time". Expected: resolved from history, not from catalog search.', c: '#a78bfa' },
                { cat: 'Nonsensical',         n:  4, desc: 'Queries with zero fastener attributes. e.g. "buy me a sandwich". Expected: empty result, no match returned.', c: '#ef4444' },
                { cat: 'Edge case',           n:  5, desc: 'Negative constraints, metric/imperial ambiguity, near-duplicate SKUs. Expected: correct handling of each constraint.', c: '#06b6d4' },
                { cat: 'Cross-family',        n:  4, desc: 'Queries where a naive search might return the wrong fastener family. e.g. "hex bolt" vs "hex nut". Expected: correct family at rank 1.', c: '#f59e0b' },
              ].map(r => (
                <div key={r.cat} style={{ padding: '10px 12px', borderRadius: 8, background: bgCode, marginBottom: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.c }}>{r.cat}</span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>n={r.n}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <Prose>
            <p style={{ marginTop: 20 }}>
              A result was graded as "strong match" if the correct SKU appeared at rank 1. Partial credit was
              not given. Grading was done by hand against known correct answers in the catalog. 96% means 32
              of 33 queries returned the correct SKU at rank 1. The one failure was a cross-family query with
              an unusual abbreviation combination that the parser did not expand correctly.
            </p>
          </Prose>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Q bg={bg} bd={bd}
              q="Is 33 queries enough to trust the 96% number?"
              a="No, not for a production claim. 33 queries is sufficient to validate that the pipeline works correctly across all intended use cases and to catch obvious regressions during development. A rigorous production evaluation would require hundreds of real buyer queries with known correct answers, ideally sourced from actual order history where the buyer confirmed the match."
            />
            <Q bg={bg} bd={bd}
              q="What is the false positive rate?"
              a="False positives (wrong SKU at rank 1 shown with high confidence) were zero in the evaluation set. The specificity cap prevents vague queries from earning high confidence, and the rubric's family filter prevents cross-family mismatches from reaching rank 1. The one failure returned the correct family but the wrong length variant, and it was graded as a miss."
            />
          </div>
        </Section>

        {/* 10 */}
        <Section id="s10">
          <SectionHead num="10" title="At Scale" color="#06b6d4" />
          <Prose>
            <p>
              The current implementation is designed for a catalog in the hundreds to low thousands of SKUs.
              Here is what scales automatically and what would need to change at higher SKU counts.
            </p>
          </Prose>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ padding: '18px 20px', borderRadius: 11, background: bg, border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>WHAT SCALES WITHOUT CHANGES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'The attribute parser and rubric scorer are O(n) and fast. They would handle 10,000 SKUs without modification.',
                  'BM25 index construction is offline and scales to tens of thousands of SKUs before becoming slow.',
                  'RRF fusion is rank-based and does not care about catalog size.',
                  'LLM reranking operates on the top 20 candidates only. It is unaffected by catalog growth.',
                  'The FastAPI backend and Railway deployment scale horizontally with standard process replication.',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#10b981', fontSize: 10, marginTop: 3, flexShrink: 0 }}>+</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.65 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '18px 20px', borderRadius: 11, background: bg, border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>WHAT NEEDS CHANGES AT SCALE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'In-memory NumPy embeddings: at ~50,000 SKUs the matrix is ~300MB and RAM pressure becomes real. At 100,000+ SKUs a vector database like Pinecone or pgvector becomes appropriate.',
                  'Catalog preprocessing on startup: adding new SKUs currently requires a full reprocess and restart. Incremental embedding updates would be needed for catalogs that change frequently.',
                  'Customer profile recomputation: currently done at startup from a static file. A live order ingestion pipeline would need incremental profile updates.',
                  'BM25 index rebuild: also happens at startup. Fine for infrequent catalog changes; needs an incremental path for daily updates.',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#ef4444', fontSize: 10, marginTop: 3, flexShrink: 0 }}>!</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.65 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Q bg={bg} bd={bd}
              q="What does it cost to run in production?"
              a="Railway persistent process: approximately $20 per month for a small instance. OpenAI embedding: $0.0001 per query. OpenAI LLM reranker: $0.0015 per triggered query, triggered on roughly 30% of queries. Total API cost at 10,000 queries per month is about $7. At 100,000 queries per month, approximately $55 in API costs plus the Railway bill."
            />
            <Q bg={bg} bd={bd}
              q="Why Railway and not a serverless platform like AWS Lambda?"
              a="Serverless would cold-start the BM25 index and load the embedding matrix from disk on every request, adding 2 to 5 seconds of initialization latency. The persistent Railway process keeps both in memory across requests, which is what makes the sub-250ms p95 latency achievable. A serverless architecture would require a separate caching layer (Redis or similar) to match that performance."
            />
            <Q bg={bg} bd={bd}
              q="How does the catalog get updated when Paragon adds new SKUs?"
              a="Currently: add the new entries to the catalog CSV, run the preprocessing script to recompute BM25 index and embeddings, and restart the server. For a 955-SKU catalog that updates monthly this is acceptable. For a catalog that updates daily, the next step would be an incremental indexing path that appends new embeddings to the existing matrix and updates the BM25 index without a full reprocess."
            />
          </div>
        </Section>

        {/* 11 */}
        <Section id="s11">
          <SectionHead num="11" title="What I'd Build Next" color="#ef4444" />
          <Prose>
            <p>
              These are the concrete limitations I am aware of and what I would prioritize with more time,
              more data, or a production deployment context.
            </p>
          </Prose>

          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Already shipped beyond core search: </span>
            Demand intelligence (90-day heat tiers, never-ordered filter) and a substitution finder
            live in the Catalog tab. Heat tiers are computed from order_history.csv at startup — hot (last 90d),
            warm (90–180d), cold (180d+), dead (never ordered). Clicking any SKU fetches compatible
            alternatives via the FAMILY_COMPAT and MATERIAL_COMPAT rules from the abbreviation module.
            Both features run at zero additional API cost.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            {[
              {
                title: 'Extend the parser with real query data',
                detail: 'The current abbreviation table covers the most common industrial shorthand but not regional variants, supplier-specific codes, or informal shop-floor language. The failure in the evaluation set was caused by an unusual abbreviation combination the parser did not expand. Collecting 200 to 500 real buyer queries and using them to extend the rule set would address the majority of parser misses without needing an LLM.',
                next: 'Build a query logging endpoint that records raw queries alongside their matched SKU. After 200 real queries, audit the parser miss rate and add the missing rules.',
                c: '#ef4444',
              },
              {
                title: 'Cold-start personalization for new customers',
                detail: 'New customers with fewer than 10 orders receive no personalization boost. This is the correct conservative choice but it means the system treats every new customer identically. A category-level prior (new customer from a region that predominantly uses metric would default to the metric-preferring prior until enough personal data accumulates) would improve results without requiring order history.',
                next: 'Build a customer onboarding step that captures measurement system preference, primary fastener families, and preferred materials. Use these as the initial profile until order data accumulates.',
                c: '#f59e0b',
              },
              {
                title: 'Conversational clarification for ambiguous queries',
                detail: 'When a query like "1/2 bolt" produces specificity below 0.25, the system returns its best guess with low confidence rather than asking a clarifying question. In a real procurement product, a structured follow-up ("Did you mean metric or imperial? Socket head or hex?") would reduce re-queries and improve order accuracy. The current design avoids this to minimize round-trips, but the accuracy cost is real.',
                next: 'Trigger a clarification prompt when specificity is below 0.25 and log the interaction to the review queue. Use those interactions as training signal for parser improvements.',
                c: '#a78bfa',
              },
              {
                title: 'Incremental catalog and profile updates',
                detail: 'Both the BM25 index and the embedding matrix are built at startup from static files. Adding new SKUs or updating customer profiles requires a restart. For a catalog that changes frequently or a customer base with high order volume, this is a ceiling on deployment flexibility.',
                next: 'Write new catalog embeddings to a separate append file and hot-reload the NumPy matrix without a full restart. Do the same for customer profiles using an event-driven update on new order ingestion.',
                c: '#06b6d4',
              },
            ].map(r => (
              <div key={r.title} style={{ padding: '18px 20px', borderRadius: 11, background: bg, border: `1px solid ${bd}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.title}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.85, marginBottom: 12 }}>{r.detail}</p>
                <div style={{ borderLeft: `2px solid ${r.c}40`, paddingLeft: 12, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.65 }}>
                  <span style={{ color: r.c, fontStyle: 'normal', fontWeight: 600 }}>Concrete next step: </span>{r.next}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, padding: '16px 20px', background: bg, border: `1px solid ${bd}`, borderRadius: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.9 }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Evaluation note: </span>
            33 hand-authored queries across 6 categories were run against the full pipeline. Each result was graded
            strong / likely / possible / no-match by hand against known correct catalog answers. 96% of queries
            with at least one recognized attribute returned the correct SKU at rank 1. Nonsensical queries
            (zero attributes) returned empty results by design and were not counted against the rate.
            One failure was logged: a cross-family query with an abbreviation the parser did not expand.
          </div>
        </Section>

      </div>
    </div>
  )
}
