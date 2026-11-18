import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { answer, client } from '../api.ts'
import { Card, Problem, say } from './Card.tsx'
import { useProjects } from './session.ts'
import './NewProjectPage.css'

// New project (tyapi docs/20, P1, P2): a project in an org the user owns or administers, made by tyapi as a graph of
// its own; it opens when its graph is ready (app/Shell.tsx, ProjectShell). A user who administers no org is told to
// ask an admin of theirs.

export default function NewProjectPage() {
  const projects = useProjects()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const orgs = projects.data?.can_create_in ?? []
  const [org, setOrg] = useState<string>()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  if (projects.isPending) return <Card lede="Reading your organizations…" />
  if (projects.error) return <Problem what="read your organizations" error={projects.error} onRetry={() => void projects.refetch()} />
  if (orgs.length === 0) return <Card lede="Only an owner or admin of an organization makes its projects. Ask one of yours." />
  const chosen = org ?? orgs[0].org

  const make = async () => {
    setBusy(true)
    setProblem(null)
    try {
      const made = await answer(client.POST('/v1/projects', { body: { org: chosen, name: name.trim() } }))
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate(`/p/${made.org}/${made.project}/draft`)
    } catch (e) {
      setProblem(say(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card lede="A new project: its own commitments, beliefs and decisions, which every member of its organization can read.">
      <form
        className="new-project"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) void make()
        }}
      >
        <label>
          <span>Organization</span>
          <select value={chosen} onChange={(e) => setOrg(e.target.value)} disabled={busy}>
            {orgs.map((o) => (
              <option key={o.org} value={o.org}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient data platform" disabled={busy} autoFocus />
        </label>
        <div className="new-project-actions">
          <button type="submit" className="btn-action" disabled={!name.trim() || busy}>
            {busy ? 'Making it…' : 'Make the project'}
          </button>
          <Link className="btn-quiet as-link" to="/">
            Cancel
          </Link>
        </div>
        {problem && (
          <p role="alert" className="signin-problem">
            Could not make it: {problem}
          </p>
        )}
      </form>
    </Card>
  )
}
