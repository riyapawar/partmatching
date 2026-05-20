export interface Customer {
  customer_id:   string
  customer_name: string
  total_orders:  number
}

export interface BreakdownItem {
  attribute: string
  status:    'exact' | 'compatible' | 'mismatch' | 'not_in_catalog' | 'missing' | 'violated'
  value:     string
  points:    number
}

export interface MatchResult {
  catalog_id:            string
  sku:                   string
  description:           string
  confidence:            number
  confidence_label:      'strong' | 'likely' | 'possible' | 'weak'
  reason:                string
  breakdown:             BreakdownItem[]
  retrieval_tags:        string[]
  personalization_fills: string[]
  semantic_sim:          number
}

export interface QueryDebug {
  system?:       string
  family?:       string
  diameter?:     string
  thread_pitch?: number
  length?:       string
  material?:     string
  finish?:       string
  specificity:   number
  negatives:     string[]
  note?:         string
}

export interface SearchResponse {
  results:     MatchResult[]
  query_debug: QueryDebug
  referential: boolean
}
