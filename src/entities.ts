import { answer, client, type Schemas } from './api.ts'
import type { Project } from './writes.ts'

// tyapi's generic record routes (its docs/20-projects-and-branches.md, P9, P10, P20; docs/21-new-commitment.md):
// any ty-core record and link, checked against the schema on the server, written to the visitor's sandbox of the
// demo. The drafting page (features/draft/) builds on these; the typed routes in writes.ts stay for test8's screens.

export type Model = Schemas['ModelOut']
export type NodeType = Schemas['NodeOut']
export type EdgeType = Schemas['EdgeOut']
export type Link = Schemas['Link']
export type Hit = Schemas['Hit']
export type Fields = Record<string, unknown>
export type LinkIn = { edge: string; to?: string; from?: string; fields?: Fields }

const where = (p: Project) => ({ org: p.org, project: p.project })

export const getModel = (p: Project) => answer(client.GET('/v1/projects/{org}/{project}/model', { params: { path: where(p) } }))

export const getRecord = (p: Project, type: string, slug: string, branch?: string) =>
  answer(client.GET('/v1/projects/{org}/{project}/entities/{type_name}/{slug}', { params: { path: { ...where(p), type_name: type, slug }, query: { branch } } }))

export const getLinks = (p: Project, type: string, slug: string, branch?: string) =>
  answer(client.GET('/v1/projects/{org}/{project}/entities/{type_name}/{slug}/links', { params: { path: { ...where(p), type_name: type, slug }, query: { branch } } }))

/** A new record; the gateway makes its slug from its text, which the answer names. */
export const createRecord = (p: Project, { type, fields, links = [] }: { type: string; fields: Fields; links?: LinkIn[] }) =>
  answer(
    client.POST('/v1/projects/{org}/{project}/entities/{type_name}', {
      params: { path: { ...where(p), type_name: type } },
      body: { fields, links: links.map((l) => ({ ...l, fields: l.fields ?? {} })) },
    }),
  )

/** Create a record with this slug, or change one: fields left out keep their value, and null clears one. */
export const putRecord = (p: Project, { type, slug, fields, links = [] }: { type: string; slug: string; fields: Fields; links?: LinkIn[] }) =>
  answer(
    client.PUT('/v1/projects/{org}/{project}/entities/{type_name}/{slug}', {
      params: { path: { ...where(p), type_name: type, slug } },
      body: { fields, links: links.map((l) => ({ ...l, fields: l.fields ?? {} })) },
    }),
  )

export const deleteRecord = (p: Project, { type, slug }: { type: string; slug: string }) =>
  answer(client.DELETE('/v1/projects/{org}/{project}/entities/{type_name}/{slug}', { params: { path: { ...where(p), type_name: type, slug } } }))

export const putLink = (p: Project, { edge, from, to, fields = {} }: { edge: string; from: string; to: string; fields?: Fields }) =>
  answer(client.PUT('/v1/projects/{org}/{project}/edges/{type_name}', { params: { path: { ...where(p), type_name: edge } }, body: { from, to, fields } }))

export const deleteLink = (p: Project, { edge, from, to }: { edge: string; from: string; to: string }) =>
  answer(client.DELETE('/v1/projects/{org}/{project}/edges/{type_name}', { params: { path: { ...where(p), type_name: edge }, query: { from, to } } }))

/** Records whose text is like this, most relevant first: candidates for the user to judge (tyapi P20). */
export const search = (p: Project, { text, types, branch, limit = 8 }: { text: string; types?: string[]; branch?: string; limit?: number }) =>
  answer(client.POST('/v1/projects/{org}/{project}/search', { params: { path: where(p) }, body: { text, types, branch, limit } }))
