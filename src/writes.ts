import { answer, client, type Schemas } from './api.ts'
import type { Field } from './domain/fields.ts'
import type { PathKey } from './domain/briefs.ts'
import type { FieldProposal } from './gateway/documents.ts'
import type { IsoDate } from './model/generated.ts'
import { type Project, branchQuery, where } from './project.ts'
import { toApi } from './wire.ts'

// Decision Watch's writes (docs/PLAN.md §2: no planners here). Each is one of tyapi's domain routes, which reads
// what it needs from the graph and builds the records on the server, as the demo's persona, at the demo's clock
// (tyapi docs/18-dw-backend.md §3). These routes are a demo's; a project of the user's own is written through
// src/entities.ts. dw sends only the intent; features/shared/useService.ts then refetches the demo's answers. The screens work in calendar days; a day in a body goes out as its midnight in UTC, the form a
// calendar day is stored in (tyapi W14; src/wire.ts).

export type Written = Schemas['WriteOut']
export type Approval = Schemas['DecisionIn']['approval']


export const importDocument = (p: Project, document: string) =>
  answer(client.POST('/v1/projects/{org}/{project}/imports', { params: { path: where(p), query: branchQuery(p) }, body: { document } }))

/** A blank draft; the gateway picks its slug, which the answer names. */
export const startBlank = (p: Project) => answer(client.POST('/v1/projects/{org}/{project}/commitments', { params: { path: where(p), query: branchQuery(p) } }))

export const acceptField = (p: Project, { slug, field }: { slug: string; field: Field }) =>
  answer(client.POST('/v1/projects/{org}/{project}/commitments/{slug}/fields/{field}/accept', { params: { path: { ...where(p), slug, field }, query: branchQuery(p) } }))

export const replaceField = (p: Project, { slug, value }: { slug: string; value: FieldProposal }) =>
  answer(
    client.POST('/v1/projects/{org}/{project}/commitments/{slug}/fields/{field}/replace', {
      params: { path: { ...where(p), slug, field: value.field }, query: branchQuery(p) },
      body: { value: toApi(value) },
    }),
  )

export const activateCommitment = (p: Project, slug: string) =>
  answer(client.POST('/v1/projects/{org}/{project}/commitments/{slug}/activate', { params: { path: { ...where(p), slug }, query: branchQuery(p) } }))

export const setWatched = (p: Project, { slug, watched }: { slug: string; watched: boolean }) =>
  answer(client.PUT('/v1/projects/{org}/{project}/commitments/{slug}/watch', { params: { path: { ...where(p), slug }, query: branchQuery(p) }, body: { watched } }))

export const judge = (p: Project, judgment: Schemas['JudgeIn']) =>
  answer(client.POST('/v1/projects/{org}/{project}/judgments', { params: { path: where(p), query: branchQuery(p) }, body: judgment }))

export const reviewFlag = (p: Project, review: Schemas['ReviewIn']) =>
  answer(client.POST('/v1/projects/{org}/{project}/reviews', { params: { path: where(p), query: branchQuery(p) }, body: review }))

export type RecordInput = {
  brief: string
  path: PathKey
  rationale: string
  conditions?: string
  /** Overrides the path's revisit date (Delay). */
  revisitAt?: IsoDate
  approval: Approval
}

export const recordDecision = (p: Project, { revisitAt, conditions, ...input }: RecordInput) =>
  answer(
    client.POST('/v1/projects/{org}/{project}/decisions', {
      params: { path: where(p), query: branchQuery(p) },
      body: toApi({ ...input, conditions: conditions || undefined, revisit_at: revisitAt }),
    }),
  )

/** The visitor's sandbox of the demo, started from its seed unless it is there already; every write goes to it
 *  (tyapi W11). A visitor who may only read the demo is refused, and reads main. */
export const startSandbox = (p: Project) => answer(client.POST('/v1/projects/{org}/{project}/sandbox', { params: { path: where(p) } }))

/** Start over: the visitor's changes to the demo are deleted, and a new sandbox starts from its seed. */
export async function startOver(p: Project) {
  await answer(client.DELETE('/v1/projects/{org}/{project}/sandbox', { params: { path: where(p) } }))
  return startSandbox(p)
}

/** Approve a decision sent for approval; the gateway reads its brief and path from the decision. */
export const approveDecision = (p: Project, decision: string) =>
  answer(client.POST('/v1/projects/{org}/{project}/decisions/{decision}/approve', { params: { path: { ...where(p), decision }, query: branchQuery(p) } }))
