# PartMatch

A catalog matching tool for industrial fasteners. Describe what you need in plain language and get the top 3 catalog matches with confidence scores and attribute-level explanations.

## How it works

Five-stage pipeline:

1. **Offline preprocessing** — parses all 955 active catalog items into a structured schema (family, diameter, thread pitch, length, material, finish) and embeds them with OpenAI `text-embedding-3-small`
2. **Hybrid retrieval** — BM25 + cosine similarity fused with Reciprocal Rank Fusion (top 20 candidates); hard metric/imperial filter
3. **Structured scoring** — point-based rubric with explicit mismatch penalties (wrong family = -30pts, wrong size = -20pts); blended with semantic similarity weighted by query specificity
4. **Personalization** — recency-decayed × log-quantity affinity profile per customer; boosts only attributes *not* explicitly in the query; shows what was inferred
5. **Conditional LLM reranking** — `gpt-4o-mini` fires only when the top-2 score gap is narrow (<10%) or the query is too vague for structured scoring

## Setup

**Requirements:** Python 3.11+, Node 18+, an OpenAI API key

```bash
# 1. Clone and install
cd partmatching
pip install -r requirements.txt
cd frontend && npm install && cd ..

# 2. Add your API key
cp .env.example .env
# edit .env and set OPENAI_API_KEY=sk-...

# 3. Preprocess catalog (one-time, ~$0.001)
python -m backend.preprocess

# 4. Start backend
uvicorn main:app --reload

# 5. Start frontend (separate terminal)
cd frontend && npm run dev
```

Open `http://localhost:5173`

## Design decisions

### Confidence score
`confidence = s_weight × structured_score + (1-s_weight) × semantic_sim`

where `s_weight = 0.40 + 0.40 × specificity`. A vague query ("hex bolt") is 40/60 structured/semantic; a fully specified query ("3/8-16 x 1-1/2 SHCS steel zinc") is 80/20. Max achievable confidence is capped by specificity (vague queries can't claim 95% confidence).

### Structured scoring rubric
| Attribute | Exact | Compatible | Mismatch penalty |
|---|---|---|---|
| Family | +35 | +20 | -30 |
| Diameter + thread | +25 | +12 | -20 |
| Length | +20 | +10 (within 10%) | -15 |
| Material | +8 | +4 | — |
| Finish | +7 | +3 | — |
| Standard | +5 | — | — |
| Negative constraint ("NOT steel") | — | — | -22 per hit |

Penalties matter: a 3/8" bolt vs a 1/4" bolt should rank below an unspecified-size bolt, not above it.

### Personalization
History only fills attributes the user *didn't* specify. If the query says "zinc" we never override it with history. Fills are shown in the UI so users can see what was inferred.

### When does the LLM fire?
Only when the top-2 confidence gap is < 10%, or query specificity is < 0.17 (no parseable attributes at all). This keeps the common case cheap and fast (two API calls: one embed, one complete). The LLM is a tiebreaker and edge-case handler, not the primary ranker.

### Abbreviation handling
Queries and catalog descriptions are expanded through a domain-specific table before BM25 indexing and query parsing (SHCS → socket head cap screw, HDG → hot dip galvanized, etc.). Both sides are expanded, so vocabulary gaps close at index time.

### Edge cases
- **Referential queries** ("same washers as last time") → bypass retrieval, resolve directly from order history
- **Metric/imperial mismatch** → hard-filtered before scoring (M8 never matches 5/16)
- **Negative constraints** ("NOT steel") → -22pt penalty per violation
- **Sparse history** (< 3 orders) → personalization disabled to avoid noisy signals
- **No matches** → graceful empty state with suggestion to rephrase
