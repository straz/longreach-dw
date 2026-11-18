import { useQueryClient } from '@tanstack/react-query'
import { formatDate, plural } from '../../domain/format.ts'
import { useGateway } from '../../gateway/react.tsx'
import { keys } from '../../queryKeys.ts'
import { type Upload, dismissJob } from '../../sources.ts'
import { useAction } from '../shared/useAction.ts'
import { useFailedJobs, useUploads } from './useUpdates.ts'

// What the update's page says about documents (tyapi docs/20, P18, P22): the files uploaded to it and how far each
// has been read, and the assistant's jobs that failed on it, until their user dismisses them.

const STATE: Record<Upload['state'], string> = {
  uploading: 'kept; waiting to be read',
  completed: 'read',
  merged: 'in main',
  discarded: 'being deleted',
  deleted: 'deleted',
}

const sized = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`)

export function Uploads() {
  const uploads = useUploads().data ?? []
  if (uploads.length === 0) return null
  return (
    <section aria-label="Documents">
      <h2 className="update-group">Documents</h2>
      <ul className="update-list">
        {uploads.map((u) => (
          <li key={u.id} className="update-row">
            <span className="update-op is-added">File</span>
            <span className="update-what">
              <span>{u.filename}</span>
              <span className="update-who">
                {sized(u.size)} · {STATE[u.state]}
                {u.source ? ` as ${u.source}` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function FailedJobs({ mine }: { mine: boolean }) {
  const gateway = useGateway()
  const queryClient = useQueryClient()
  const jobs = useFailedJobs().data ?? []
  const { busy, problem, run } = useAction()
  if (jobs.length === 0) return null
  const dismiss = (id: number) =>
    run(async () => {
      await dismissJob(gateway, gateway.branch, id)
      await queryClient.invalidateQueries({ queryKey: keys.jobs(gateway.graph, gateway.branch) })
    }, String(id))
  return (
    <section aria-label="Failed jobs">
      {jobs.map((j) => (
        <p key={j.id} className="update-review-all" role="alert">
          <span>
            {j.message}
            {j.written > 0 && ` ${plural(j.written, 'record')} it wrote are kept, not reviewed.`} ({formatDate(j.ended_at.slice(0, 10))})
          </span>
          {mine && (
            <button type="button" className="btn-quiet is-small" disabled={busy !== null} onClick={() => void dismiss(j.id)}>
              Dismiss
            </button>
          )}
        </p>
      ))}
      {problem && <p className="update-lede">Could not dismiss it: {problem}</p>}
    </section>
  )
}
