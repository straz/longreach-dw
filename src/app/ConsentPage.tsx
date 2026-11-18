import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { formatDate } from '../domain/format.ts'
import { useAction } from '../features/shared/useAction.ts'
import { keys } from '../queryKeys.ts'
import { type Consent, getConsent, giveConsent, withdrawConsent } from '../sources.ts'
import { Card, Problem } from './Card.tsx'
import { useProjects } from './session.ts'
import './PageForm.css'

// Model providers (tyapi docs/20, P21): whether an organization lets Decision Watch's assistant send its documents to
// outside model providers, and which. Its owners and admins give or withdraw it, to the terms shown; tyapi keeps who
// did and when. Without it, Decision Watch offers no assistant, and works without one.

export default function ConsentPage() {
  const projects = useProjects()
  if (projects.isPending) return <Card lede="Reading your organizations…" />
  if (projects.error) return <Problem what="read your organizations" error={projects.error} onRetry={() => void projects.refetch()} />
  const orgs = projects.data.can_create_in
  if (orgs.length === 0) return <Card lede="Only an owner or admin of an organization consents for it. Ask one of yours." />
  return (
    <Card lede="Decision Watch's assistant reads the documents you upload and drafts records from them, with outside model providers. Your organization chooses whether it may, and which.">
      {orgs.map((o) => (
        <OrgConsent key={o.org} org={o.org} name={o.name} />
      ))}
      <Link className="btn-quiet as-link" to="/">
        Back
      </Link>
    </Card>
  )
}

function OrgConsent({ org, name }: { org: string; name: string }) {
  const queryClient = useQueryClient()
  const consent = useQuery({ queryKey: keys.consent(org), queryFn: () => getConsent(org) })
  const [chosen, setChosen] = useState<string[] | null>(null)
  const { busy, problem, run } = useAction()
  if (consent.isPending) return <p className="page-form">Reading {name}’s consent…</p>
  if (consent.error) return <p className="page-form-problem" role="alert">Could not read {name}’s consent: {consent.error.message}</p>
  const found: Consent = consent.data
  const picked = chosen ?? found.consent?.providers ?? []
  const save = (what: () => Promise<Consent>) =>
    run(async () => {
      queryClient.setQueryData(keys.consent(org), await what())
      setChosen(null)
    })
  return (
    <section className="page-form" aria-label={`${name}'s consent`}>
      <h2>{name}</h2>
      <p>
        {found.consent
          ? `Consented to ${found.consent.providers.join(' and ')} by ${found.consent.by_name ?? found.consent.by}, ${formatDate(found.consent.at.slice(0, 10), { long: true })}.`
          : 'No consent: Decision Watch offers no assistant here.'}
      </p>
      {found.offered.map((p) => (
        <label key={p.id} className="page-form-check">
          <input
            type="checkbox"
            checked={picked.includes(p.id)}
            disabled={!found.can_change || busy !== null}
            onChange={(e) => setChosen(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))}
          />
          <span>{p.name}</span>
        </label>
      ))}
      <p className="page-form-terms">
        {found.terms} (Terms of {found.terms_version}.)
      </p>
      {found.can_change ? (
        <div className="page-form-actions">
          <button type="button" className="btn-action" disabled={picked.length === 0 || busy !== null} onClick={() => void save(() => giveConsent(org, picked, found.terms_version))}>
            {found.consent ? 'Change consent' : 'Consent'}
          </button>
          {found.consent && (
            <button type="button" className="btn-quiet" disabled={busy !== null} onClick={() => void save(() => withdrawConsent(org))}>
              Withdraw
            </button>
          )}
        </div>
      ) : (
        <p>Only an owner or admin of {name} changes it.</p>
      )}
      {problem && (
        <p role="alert" className="page-form-problem">
          That did not work: {problem}
        </p>
      )}
    </section>
  )
}
