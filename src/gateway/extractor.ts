import type { IsoDate, NodeData } from '../model/generated.ts'

// Field extraction from documents (test8's docs/PLAN.md §4.2). The extractions are authored with each demo in
// tyapi (demos/<org>/imports.yaml) and come with its content (features/shared/client.tsx, useDocuments); a real
// extractor would read the uploaded file and return the same shape.

export type FieldProposal =
  | { field: 'promise'; text: string; span?: string; title: string }
  | { field: 'capital'; text: string; span?: string; amount: number; until?: IsoDate }
  | { field: 'owner'; text: string; span?: string; party: string }
  | { field: 'rationale'; text: string; span?: string; decision: { statement: string; decided_at: string; by: string; under: string } }
  | { field: 'assumptions'; text: string; span?: string; beliefs: { belief: string; necessary: boolean }[] }
  | { field: 'success_criteria'; text: string; span?: string; target_at?: IsoDate }
  | { field: 'dependencies'; text: string; span?: string; on: { commitment: string; kind: 'requires' | 'funds' | 'precedes' | 'assumes' | 'other' }[] }

export type SampleDocument = {
  /** Also the Source slug the import writes. */
  slug: string
  kind: NodeData['Source']['kind']
  /** What kind of document it is, in the brief's words: Investment case, Vendor contract… */
  label: string
  filename: string
  title: string
  occurred_at: IsoDate
  /** Markdown, with extracted passages marked [[span-id]]…[[/]]. */
  text: string
  commitment: { slug: string; scale: NodeData['Commitment']['scale']; horizon_at?: IsoDate; counterparty?: string }
  fields: FieldProposal[]
  /** Listed in the import sheet; false for a document seeded as already imported. */
  sample: boolean
}
