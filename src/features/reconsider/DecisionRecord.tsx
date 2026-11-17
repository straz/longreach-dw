import { Link } from 'react-router'
import type { Brief } from '../../domain/briefs.ts'
import { formatDate, formatMoney } from '../../domain/format.ts'
import { useRouteState } from '../shared/routeState.ts'
import { useDirectory } from '../shared/useDirectory.ts'
import WriteError from '../shared/WriteError.tsx'
import { useDecisionWrite } from './useDecisionWrite.ts'
import { OUTCOME_TEXT, briefLabel } from './words.ts'

// A recorded decision, read back from the graph: the path chosen, under whose
// mandate, why, and the alternatives it was weighed against. Decided briefs
// read the same whether seeded or recorded in this session.


export default function DecisionRecord({ brief, earlier = false }: { brief: Brief; earlier?: boolean }) {
  const { href } = useRouteState()
  const { partyName: name } = useDirectory()
  const d = brief.decision!
  const m = d.mandate
  return (
    <section className="bsection decision">
      <h2 className="caps-label">{earlier ? 'Earlier decision' : 'Decision'}</h2>
      <p className="decision-head">
        <strong>{OUTCOME_TEXT[d.outcome] ?? d.outcome}</strong> {formatDate(d.held_at, { long: true })} · {name(d.decided_by)}
        {m && (
          <>
            {' '}
            under <span className="decision-mandate">{m.mandate}</span>
            {m.holder !== d.decided_by && ` (${m.holder_name})`}
            {!d.approved && ', awaiting approval'}
          </>
        )}
      </p>
      <p className="decision-statement">{d.statement}</p>
      {!d.approved && <Approve brief={brief} />}
      {d.rationale && <p className="decision-rationale">{d.rationale}</p>}
      {brief.supersededBy && (
        <p className="decision-note">
          Its revisit date arrived with the evidence it waited for;{' '}
          <Link to={href(`/reconsider/${brief.supersededBy}`)}>{briefLabel(brief.supersededBy) ?? 'a newer brief'}</Link> takes it up.
        </p>
      )}
      {brief.state === 'deferred' && brief.revisit && <p className="decision-note">The brief returns on {formatDate(brief.revisit)}, or earlier if its flag reopens.</p>}
      {d.alternatives.length > 0 && (
        <ul className="alts">
          {d.alternatives.map((a) => (
            <li key={a.alternative} className={a.chosen ? 'is-chosen' : ''}>
              <span className="alts-mark">{a.chosen ? 'Chosen' : 'Weighed'}</span>
              <div>
                <p>
                  {a.statement}
                  {a.incremental_value !== undefined && a.incremental_value !== 0 && <span className="alts-cash"> · {formatMoney(a.incremental_value, { signed: true })} against Continue</span>}
                </p>
                {a.reasons.length > 0 && (
                  <ul className="alts-reasons">
                    {a.reasons.map((r) => (
                      <li key={r.reason} className={`is-${r.polarity}`}>
                        {r.polarity === 'pro' ? 'For' : 'Against'}: {r.statement}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * A decision waiting on another holder's mandate. The holder decides outside
 * the tool (a board votes in its meeting); recording their approval here
 * enacts the path.
 */
function Approve({ brief }: { brief: Brief }) {
  const write = useDecisionWrite(brief)
  const d = brief.decision!
  const m = d.mandate!
  const path = d.path
  if (!path) return null
  const approve = () => void write.approve(d.decision)
  return (
    <div className="approve">
      <p>
        Waiting for <strong>{m.holder_name}</strong> under <strong>{m.mandate}</strong>. Nothing changes until they approve; when they have, record it here.
      </p>
      <WriteError error={write.error} />
      <button type="button" className="btn-action" disabled={write.readOnly || write.pending} title={write.readOnly ? write.why : undefined} onClick={approve}>
        {write.pending ? 'Recording…' : `Record ${m.holder_name}'s approval`}
      </button>
    </div>
  )
}
