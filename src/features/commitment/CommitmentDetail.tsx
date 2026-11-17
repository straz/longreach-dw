import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { daysAway, formatDate, formatMoney } from '../../domain/format.ts'
import type { CommitmentDetail as Detail } from '../../domain/detail.ts'
import { useDocuments } from '../shared/client.tsx'
import DocumentView from './DocumentView.tsx'
import VerifySheet from './VerifySheet.tsx'
import { acceptedCount } from '../../domain/fields.ts'
import { setWatched } from '../../writes.ts'
import CapitalBar from '../../ui/charts/CapitalBar.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { useEvidence } from '../shared/useEvidence.ts'
import { useIndicators, usePortfolio } from '../shared/usePortfolio.ts'
import { useService } from '../shared/useService.ts'
import DateSpine from './DateSpine.tsx'
import { useCommitmentDetail } from './hooks.ts'
import GraphError from '../shared/GraphError.tsx'
import { Assumptions, Dependencies, History, Options, Rationale, Risks, SuccessCriteria } from './sections.tsx'
import './CommitmentDetail.css'
import { useWriteContext } from '../shared/useWriteContext.ts'

// One commitment (docs/PLAN.md §4.2): header, capital clock, promise,
// rationale, assumptions and the rest, with its dates on the spine at right.

const STATUS_LABEL = { active: 'Active', unverified: 'Needs verification', incomplete: 'In progress', past: 'Past' } as const

export default function CommitmentDetail({ slug }: { slug: string }) {
  const { detail, isLoading, error } = useCommitmentDetail(slug)
  const { portfolio } = usePortfolio()
  if (error && !detail) return <GraphError error={error} />
  if (isLoading && !detail) return <DetailSkeleton />
  if (!detail) {
    const exists = portfolio?.commitments.some((c) => c.commitment === slug)
    return (
      <div className="cdetail-missing">
        <h1>{exists ? 'Not yet committed on this date' : 'No such commitment'}</h1>
        <p>{exists ? 'This commitment was made after the as-of date. Move the date forward to see it.' : `Nothing in the graph is called “${slug}”.`}</p>
      </div>
    )
  }
  const proposed = detail.view.status === 'unverified' || detail.view.status === 'incomplete'
  if (proposed) return <Proposed detail={detail} />
  return (
    <div className="cdetail-wrap">
      <article className="cdetail" key={slug}>
        <Activated view={detail.view} />
        <Header detail={detail} />
        <Body detail={detail} />
      </article>
      <DateSpine detail={detail} />
    </div>
  )
}

/** A commitment being recorded: the verification sheet beside its source document. */
function Proposed({ detail }: { detail: Detail }) {
  const docs = useDocuments()
  const doc = docs?.find((d) => d.slug === detail.recordedIn?.source)
  const [focus, setFocus] = useState<string>()
  return (
    <div className="cdetail-wrap">
      <article className="cdetail" key={detail.view.commitment}>
        <Header detail={detail} />
        <VerifySheet view={detail.view} doc={doc} focus={focus} onFocus={setFocus} />
      </article>
      <aside className="docpanel" aria-label="Source document">
        <h2 className="spine-title">{doc ? `Source · ${doc.filename}` : 'Source'}</h2>
        {doc ? (
          <DocumentView text={doc.text} focus={focus} onSpan={setFocus} />
        ) : (
          <p className="docpanel-empty">Written in Longreach. There is no source document; each field is the owner's own claim.</p>
        )}
      </aside>
    </div>
  )
}

/** Shown once, after activation, until the page is left. */
function Activated({ view }: { view: Detail['view'] }) {
  const [search, setSearch] = useSearchParams()
  if (search.get('activated') !== '1') return null
  const dismiss = () => {
    const next = new URLSearchParams(search)
    next.delete('activated')
    setSearch(next, { replace: true })
  }
  return (
    <p className="cdetail-activated" role="status">
      <span>
        <strong>Activated.</strong>{' '}
        {view.moved
          ? 'It rests on an assumption that no longer holds, so it is listed under Needs attention and counts in the headline.'
          : 'Its assumptions and dependencies are now watched.'}
      </span>
      <button type="button" className="btn-quiet" onClick={dismiss}>
        Dismiss
      </button>
    </p>
  )
}

function Header({ detail }: { detail: Detail }) {
  const { asOf, href } = useRouteState()
  const v = detail.view
  const moved = v.foundations.filter((f) => f.necessary && f.state === 'contradicting')
  const term = [v.committed_at && formatDate(v.committed_at, { long: true }), v.horizon_at && formatDate(v.horizon_at, { long: true })].filter(Boolean).join(' to ')
  const ev = useEvidence()
  const beliefText = (slug: string) => ev.belief(slug)?.statement ?? slug

  return (
    <header className="cdetail-head">
      <div className="cdetail-titlerow">
        <h1 className="cdetail-title">{v.title}</h1>
        <div className="cdetail-actions">
          <span className={`status-pill is-${v.status}`}>
            {STATUS_LABEL[v.status]}
            {v.fields && v.status === 'unverified' ? ` · ${acceptedCount(v.fields)} of ${v.fields.length}` : ''}
          </span>
          {v.status === 'active' && <WatchToggle detail={detail} />}
        </div>
      </div>
      <p className="cdetail-meta">
        {v.fields
          ? detail.recordedIn
            ? `Imported ${formatDate(v.committed_at ?? asOf)} from ${detail.recordedIn.title} · fields extracted by the Longreach extraction agent`
            : `Started ${formatDate(v.committed_at ?? asOf)} in Longreach`
          : [v.counterparty, detail.recordedIn?.title, v.owner && `owner ${v.owner.name}`, term].filter(Boolean).join(' · ')}
      </p>
      {v.moved && v.capital && (
        <p className="cdetail-callout">
          <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M5 0.6 L9.6 9.2 H0.4 Z" fill="currentColor" />
          </svg>
          <span>
            Rests on {moved.length === 1 ? 'an assumption that no longer holds' : 'assumptions that no longer hold'}:{' '}
            {moved.map((m) => `“${beliefText(m.belief)}”`).join(' and ')}.{' '}
            {v.capital.avoidable > 0 && v.capital.until && (
              <strong>
                {formatMoney(v.capital.avoidable)} avoidable until {formatDate(v.capital.until)} {daysAway(v.capital.until, asOf)}.
              </strong>
            )}{' '}
            <Link to={href('/watch/flags', { row: moved[0] && `belief:${moved[0].belief}` })}>See the evidence in Watch</Link>
          </span>
        </p>
      )}
    </header>
  )
}

function WatchToggle({ detail }: { detail: Detail }) {
  const { readOnly, why } = useWriteContext()
  const v = detail.view
  const mutation = useService(setWatched)
  const watched = !!v.watched
  return (
    <button
      type="button"
      className={`watch-toggle${watched ? ' is-on' : ''}`}
      aria-pressed={watched}
      disabled={readOnly || mutation.isPending}
      title={readOnly ? why : watched ? 'Stop watching this commitment' : 'Watch this commitment'}
      onClick={() => mutation.mutate({ slug: v.commitment, watched: !watched })}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M1.5 8 C3.5 4.4 5.6 3 8 3 C10.4 3 12.5 4.4 14.5 8 C12.5 11.6 10.4 13 8 13 C5.6 13 3.5 11.6 1.5 8 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="8" r="2.2" fill={watched ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" />
        {!watched && <path d="M2.5 13.5 L13.5 2.5" stroke="currentColor" strokeWidth="1.4" />}
      </svg>
      {mutation.isPending ? 'Saving…' : watched ? 'Watching' : 'Not watched'}
    </button>
  )
}

function Body({ detail }: { detail: Detail }) {
  const indicators = useIndicators()
  const v = detail.view
  const c = v.capital
  return (
    <div className="cdetail-body">
      {c && (
        <section className="csec">
          <h2 className="csec-title caps-label">Capital</h2>
          {c.authorized !== undefined ? (
            <ProgramCapital authorized={c.authorized} />
          ) : (
            <>
              <dl className="capital-figures">
                <div>
                  <dt>Total</dt>
                  <dd>{formatMoney(c.total)}</dd>
                </div>
                <div>
                  <dt>Spent</dt>
                  <dd>{formatMoney(c.sunk)}</dd>
                </div>
                <div>
                  <dt>Committed, unspent</dt>
                  <dd>{formatMoney(c.unspent)}</dd>
                </div>
                <div className={c.avoidable ? `is-avoidable${v.moved ? ' is-moved' : ''}` : ''}>
                  <dt>Still avoidable</dt>
                  <dd>
                    {formatMoney(c.avoidable)}
                    {c.until && c.avoidable > 0 && <span> until {formatDate(c.until)}</span>}
                  </dd>
                </div>
                {c.atRisk > 0 && (
                  <div className="is-moved">
                    <dt>At risk if it fails</dt>
                    <dd>{formatMoney(c.atRisk)}</dd>
                  </div>
                )}
              </dl>
              <CapitalBar sunk={c.sunk} unspent={c.unspent} avoidable={c.avoidable} height={12} tone={v.moved ? 'moved' : 'calm'} />
              <p className="csec-note">Reading of {formatDate(c.as_of, { long: true })}.</p>
            </>
          )}
        </section>
      )}

      <section className="csec">
        <h2 className="csec-title caps-label">Promise</h2>
        <p className="cdetail-promise">{v.statement}</p>
        {detail.recordedIn && (
          <p className="csec-note">
            From {detail.recordedIn.title}
            {detail.recordedIn.external_id ? ` (${detail.recordedIn.external_id})` : ''}
            {detail.view.recognition === 'confirmed' ? ', confirmed by its owner' : ', not yet confirmed'}.
          </p>
        )}
      </section>

      {detail.origin && <Rationale origin={detail.origin} />}
      <Assumptions view={v} indicators={indicators} />
      {detail.tripwires.length > 0 && <SuccessCriteria tripwires={detail.tripwires} indicators={indicators} />}
      {detail.dependencies.length > 0 && <Dependencies dependencies={detail.dependencies} horizon={v.horizon_at} />}
      {detail.options.length > 0 && <Options options={detail.options} />}
      {detail.risks.length > 0 && <Risks risks={detail.risks} />}
      {detail.history.length > 0 && <History history={detail.history} />}
    </div>
  )
}

function ProgramCapital({ authorized }: { authorized: number }) {
  const { portfolio } = usePortfolio()
  const h = portfolio?.headline
  if (!h) return null
  return (
    <>
      <dl className="capital-figures">
        <div>
          <dt>Authorized</dt>
          <dd>{formatMoney(authorized)}</dd>
        </div>
        <div>
          <dt>Committed</dt>
          <dd>{formatMoney(h.committed)}</dd>
        </div>
        <div>
          <dt>Headroom</dt>
          <dd>{formatMoney(authorized - h.committed)}</dd>
        </div>
        <div className="is-avoidable is-moved">
          <dt>Under moved assumptions</dt>
          <dd>{formatMoney(h.movedCapital)}</dd>
        </div>
      </dl>
      <CapitalBar sunk={0} unspent={h.committed} avoidable={h.movedCapital} scale={authorized} height={12} tone="moved" />
      <p className="csec-note">Committed across the program's commitments; amber is unspent capital resting on a contradicted assumption.</p>
    </>
  )
}

function DetailSkeleton() {
  return (
    <div className="cdetail-wrap" aria-busy="true">
      <article className="cdetail">
        <div className="cdetail-head">
          <span className="skel is-title" />
          <span className="skel is-line" />
        </div>
        <div className="cdetail-body">
          {[0, 1, 2].map((i) => (
            <div key={i} className="csec">
              <span className="skel is-label" />
              <span className="skel is-block" />
            </div>
          ))}
        </div>
      </article>
      <aside className="spine" />
    </div>
  )
}
