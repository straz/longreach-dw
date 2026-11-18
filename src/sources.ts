import { answer, client, type Schemas } from './api.ts'
import { type Project, branchQuery, where } from './project.ts'

// tyapi's Phase 6 (its docs/20-projects-and-branches.md, P18, P21, P22): documents uploaded to an update, kept in its
// bucket and read by Decision Watch's assistant (dw-assist) into a Source; the org's consent to the model providers
// that assistant calls; and the assistant's jobs that failed, shown on their update.

export type Upload = Schemas['Upload']
export type JobReport = Schemas['JobReport']
export type Consent = Schemas['ConsentOut']

/** Upload a file to the update worked in, or, reading a project's main, to a new one named for it (tyapi P5): tyapi
 *  records it and signs a PUT, and the file goes from the browser straight to the bucket. */
export async function uploadFile(p: Project, file: File): Promise<Upload> {
  const body = { filename: file.name, content_type: file.type || 'application/octet-stream', size: file.size }
  const sent = await answer(client.POST('/v1/projects/{org}/{project}/sources/uploads', { params: { path: where(p), query: branchQuery(p) }, body }))
  const put = await fetch(sent.url, { method: 'PUT', body: file, headers: sent.headers })
  if (!put.ok) throw new Error(`the bucket did not take ${file.name}: ${put.status} ${await put.text()}`)
  return sent.upload
}

export const listUploads = async (p: Project, branch: string) =>
  (await answer(client.GET('/v1/projects/{org}/{project}/branches/{branch}/uploads', { params: { path: { ...where(p), branch } } }))).uploads

/** The update's failed assistant jobs that its user has not dismissed. */
export const listFailedJobs = async (p: Project, branch: string) =>
  (await answer(client.GET('/v1/projects/{org}/{project}/branches/{branch}/jobs', { params: { path: { ...where(p), branch } } }))).jobs

export const dismissJob = (p: Project, branch: string, report: number) =>
  answer(client.POST('/v1/projects/{org}/{project}/branches/{branch}/jobs/{report}/dismiss', { params: { path: { ...where(p), branch, report } } }))

export const getConsent = (org: string) => answer(client.GET('/v1/orgs/{org}/model-consent', { params: { path: { org } } }))

export const giveConsent = (org: string, providers: string[], termsVersion: string) =>
  answer(client.PUT('/v1/orgs/{org}/model-consent', { params: { path: { org } }, body: { providers: providers as Schemas['ConsentIn']['providers'], terms_version: termsVersion } }))

export const withdrawConsent = (org: string) => answer(client.DELETE('/v1/orgs/{org}/model-consent', { params: { path: { org } } }))
