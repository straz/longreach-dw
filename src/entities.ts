import { answer, client, type Schemas } from './api.ts'
import { type Project, branchQuery, isMain, where } from './project.ts'

// tyapi's generic record routes (its docs/20-projects-and-branches.md, P9, P10, P20; docs/21-new-commitment.md):
// any ty-core record and link, checked against the schema on the server, read from and written to the branch the
// visitor works in (project.ts). The drafting page (features/draft/) builds on these; the typed routes in writes.ts
// stay for test8's screens.

export type Model = Schemas['ModelOut']
export type NodeType = Schemas['NodeOut']
/** A link type of the model: its ends, cardinality and fields. */
export type EdgeSpec = Schemas['EdgeOut']
export type Link = Schemas['Link']
export type Hit = Schemas['Hit']
export type Fields = Record<string, unknown>
export type LinkIn = { edge: string; to?: string; from?: string; fields?: Fields }

const linksBody = (links: LinkIn[]) => links.map((l) => ({ ...l, fields: l.fields ?? {} }))

export const getModel = (p: Project) => answer(client.GET('/v1/projects/{org}/{project}/model', { params: { path: where(p) } }))

export const getRecord = (p: Project, type: string, slug: string) =>
  answer(client.GET('/v1/projects/{org}/{project}/entities/{type_name}/{slug}', { params: { path: { ...where(p), type_name: type, slug }, query: branchQuery(p) } }))

export const getLinks = (p: Project, type: string, slug: string) =>
  answer(client.GET('/v1/projects/{org}/{project}/entities/{type_name}/{slug}/links', { params: { path: { ...where(p), type_name: type, slug }, query: branchQuery(p) } }))

/** A new record; the gateway makes its slug from its text, which the answer names. */
export const createRecord = (p: Project, { type, fields, links = [] }: { type: string; fields: Fields; links?: LinkIn[] }) =>
  answer(
    client.POST('/v1/projects/{org}/{project}/entities/{type_name}', {
      params: { path: { ...where(p), type_name: type }, query: branchQuery(p) },
      body: { fields, links: linksBody(links) },
    }),
  )

/** Create a record with this slug, or change one: fields left out keep their value, and null clears one. */
export const putRecord = (p: Project, { type, slug, fields, links = [] }: { type: string; slug: string; fields: Fields; links?: LinkIn[] }) =>
  answer(
    client.PUT('/v1/projects/{org}/{project}/entities/{type_name}/{slug}', {
      params: { path: { ...where(p), type_name: type, slug }, query: branchQuery(p) },
      body: { fields, links: linksBody(links) },
    }),
  )

export const deleteRecord = (p: Project, { type, slug }: { type: string; slug: string }) =>
  answer(client.DELETE('/v1/projects/{org}/{project}/entities/{type_name}/{slug}', { params: { path: { ...where(p), type_name: type, slug }, query: branchQuery(p) } }))

export const putLink = (p: Project, { edge, from, to, fields = {} }: { edge: string; from: string; to: string; fields?: Fields }) =>
  answer(client.PUT('/v1/projects/{org}/{project}/edges/{type_name}', { params: { path: { ...where(p), type_name: edge }, query: branchQuery(p) }, body: { from, to, fields } }))

export const deleteLink = (p: Project, { edge, from, to }: { edge: string; from: string; to: string }) =>
  answer(client.DELETE('/v1/projects/{org}/{project}/edges/{type_name}', { params: { path: { ...where(p), type_name: edge }, query: { from, to, ...branchQuery(p) } } }))

/** Records whose text is like this, most relevant first: candidates for the user to judge (tyapi P20). */
export const search = (p: Project, { text, types, limit = 8 }: { text: string; types?: string[]; limit?: number }) =>
  answer(client.POST('/v1/projects/{org}/{project}/search', { params: { path: where(p) }, body: { text, types, limit, branch: isMain(p.branch) ? undefined : p.branch } }))

/** A record's links as they would be sent to write it again: each from or to the other end, with its fields. */
export const asLinksIn = (links: Link[]): LinkIn[] =>
  links.map((l) => (l.direction === 'out' ? { edge: l.edge, to: l.slug, fields: l.fields } : { edge: l.edge, from: l.slug, fields: l.fields }))
