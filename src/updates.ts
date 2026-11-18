import { answer, client, type Schemas } from './api.ts'
import { refKey } from './domain/record.ts'
import { type Project, where } from './project.ts'

// tyapi's updates (its docs/20-projects-and-branches.md, P5, P11, P19): a user's pending changes to a demo or project,
// one branch each, several at once. The user chooses which one dw reads and writes (features/updates/); with none
// chosen, their sandbox of a demo, or a project's main.

export type Update = Schemas['UpdateOut']
export type Change = Schemas['Change']
export type Changes = Schemas['ChangesOut']
export type Conflict = Schemas['Conflict']
/** A record of an update's, as revert names it. */
export type RecordRef = Schemas['RecordRef']

/** The user's own open updates (and their sandbox of a demo). */
export const listUpdates = async (p: Project) =>
  (await answer(client.GET('/v1/projects/{org}/{project}/branches', { params: { path: where(p), query: { author: 'me' } } }))).updates

export const startUpdate = (p: Project, name: string) =>
  answer(client.POST('/v1/projects/{org}/{project}/branches', { params: { path: where(p) }, body: { name } }))

export const renameUpdate = (p: Project, branch: string, name: string) =>
  answer(client.PATCH('/v1/projects/{org}/{project}/branches/{branch}', { params: { path: { ...where(p), branch } }, body: { name } }))

export const discardUpdate = (p: Project, branch: string) =>
  answer(client.DELETE('/v1/projects/{org}/{project}/branches/{branch}', { params: { path: { ...where(p), branch } } }))

/** What the update changes; since a cursor, only the records written after it. */
export const getChanges = (p: Project, branch: string, since?: string) =>
  answer(client.GET('/v1/projects/{org}/{project}/branches/{branch}/changes', { params: { path: { ...where(p), branch }, query: { since } } }))

export const revertRecords = (p: Project, branch: string, records: RecordRef[]) =>
  answer(client.POST('/v1/projects/{org}/{project}/branches/{branch}/revert', { params: { path: { ...where(p), branch } }, body: { records } }))

/** Whether an update can merge into main, and each reason it cannot (tyapi P16). */
export const getReadiness = (p: Project, branch: string) =>
  answer(client.GET('/v1/projects/{org}/{project}/branches/{branch}/readiness', { params: { path: { ...where(p), branch } } }))

/** Merge an update into main; it closes. Needs maintain. */
export const mergeUpdate = (p: Project, branch: string) =>
  answer(client.POST('/v1/projects/{org}/{project}/branches/{branch}/merge', { params: { path: { ...where(p), branch } } }))

export type Resolution = Schemas['Resolution']

/** Resolve every conflict of an update, each record as the user confirmed it (null lets it go); confirm lets go of
 *  the links added to a record let go. */
export const resolveConflicts = (p: Project, branch: string, records: Resolution[], confirm = false) =>
  answer(client.POST('/v1/projects/{org}/{project}/branches/{branch}/resolve', { params: { path: { ...where(p), branch } }, body: { records, confirm } }))

/** Mark an AI's changes reviewed: those named, or all not yet reviewed (tyapi P14). The update's author only. */
export const reviewChanges = (p: Project, branch: string, records: RecordRef[], all = false) =>
  answer(client.POST('/v1/projects/{org}/{project}/branches/{branch}/reviews', { params: { path: { ...where(p), branch } }, body: { records, all } }))

/** The record a change is to, keyed as the outline keys records (refKey). */
export const changeKey = (c: Pick<Change, 'type' | 'id'>) => refKey({ type: c.type, slug: c.id })

/** A record's identity in an update, a change's or a conflict's: a record and a link can share a type name's key,
 *  so the kind is part of it. */
export const changeId = (c: RecordRef) => `${c.kind}:${changeKey(c)}`

/** A change or conflict as the routes name a record (revert, reviews). */
export const asRecordRef = ({ kind, type, id }: RecordRef): RecordRef => ({ kind, type, id })

/** Changes merged with a later answer's: a record written back as it was leaves the list. */
export function mergeChanges(before: Change[], later: Change[]): Change[] {
  const byId = new Map(before.map((c) => [changeId(c), c]))
  for (const c of later) {
    if (c.op === 'unchanged') byId.delete(changeId(c))
    else byId.set(changeId(c), c)
  }
  return [...byId.values()]
}
