import { useState } from 'react'
import { FIELD_LABEL, type Field, type FieldState, acceptedCount } from '../../domain/fields.ts'
import { currentOrigin } from '../../domain/detail.ts'
import { originDecisionSlug } from '../../domain/slugs.ts'
import { formatMoney } from '../../domain/format.ts'
import { coveringMandates, covers } from '../../domain/mandates.ts'
import type { CommitmentView } from '../../domain/portfolio.ts'
import type { FieldProposal, SampleDocument } from '../../gateway/extractor.ts'
import { useGatewayQuery } from '../../gateway/react.tsx'
import { acceptField, activateCommitment, replaceField } from '../../writes.ts'
import { useClient } from '../shared/client.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { useService } from '../shared/useService.ts'
import { useWriteContext } from '../shared/useWriteContext.ts'
import WriteError from '../shared/WriteError.tsx'
import FieldEditor from './FieldEditor.tsx'
import { FieldValue, useNames } from './fieldText.tsx'
import './VerifySheet.css'

// Verifying a commitment, field by field (docs/PLAN.md §2.3, §4.2). Each
// field shows its value and the passage it came from; the owner accepts it
// or replaces it with their own. Activate is enabled when all are accepted.

type Props = {
  view: CommitmentView
  doc?: SampleDocument
  focus?: string
  onFocus: (span?: string) => void
}

export default function VerifySheet({ view, doc, focus, onFocus }: Props) {
  const { asOf, go } = useRouteState()
  const names = useNames()
  const { user } = useClient()
  const { at, readOnly, why } = useWriteContext()
  const row = useGatewayQuery('commitments', {}, asOf).data?.find((c) => c.commitment === view.commitment)
  const extractedQ = useGatewayQuery('extracted_by', {}, asOf)
  const claimedQ = useGatewayQuery('claimed_by', {}, asOf)
  const extractedBy = extractedQ.data ?? []
  const claimedBy = claimedQ.data ?? []
  const accept = useService(acceptField)
  const replace = useService(replaceField)
  const activate = useService(activateCommitment)
  const [editing, setEditing] = useState<Field>()
  const origin = currentOrigin(useGatewayQuery('origins', {}, asOf).data ?? [], view.commitment)?.decision ?? originDecisionSlug(view.commitment)
  const authority = useAuthority(view, origin)

  const fields = view.fields ?? []
  const accepted = acceptedCount(fields)
  const all = accepted === fields.length && fields.length > 0
  const busy = accept.isPending || replace.isPending || activate.isPending
  const proposalOf = (f: Field) => doc?.fields.find((p) => p.field === f)
  const error = accept.error ?? replace.error ?? activate.error

  // Awaited rather than onSuccess: activation re-renders this page as an
  // active commitment, which unmounts the sheet before a callback would run.
  const loading = !names.ready || !row || !extractedQ.data || !claimedQ.data

  const doActivate = async () => {
    if (!row) return
    try {
      await activate.mutateAsync(row.commitment)
      go(`/commitment/${row.commitment}?activated=1`)
    } catch {
      // Shown below the fields from activate.error.
    }
  }

  if (loading) {
    return (
      <div className="verify" aria-busy="true">
        <div className="verify-progress">
          {fields.map((f) => (
            <span key={f.field} />
          ))}
        </div>
        {fields.map((f) => (
          <div key={f.field} className="vfield is-loading">
            <span className="skel is-label" />
            <span className="skel is-line" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="verify">
      <div className="verify-progress" role="progressbar" aria-valuemin={0} aria-valuemax={fields.length} aria-valuenow={accepted}>
        {fields.map((f) => (
          <span key={f.field} className={`is-${f.status}`} title={`${FIELD_LABEL[f.field]}: ${f.status}`} />
        ))}
      </div>
      <p className="verify-lede">
        {view.status === 'unverified'
          ? `${accepted} of ${fields.length} fields verified. Check each against the document, then activate.`
          : `${fields.filter((f) => f.status === 'missing').length} fields still missing. Add each one; nothing is watched until the commitment is active.`}
      </p>

      <ol className="vfields">
        {fields.map((f) => (
          <FieldRow
            key={f.field}
            state={f}
            proposal={proposalOf(f.field)}
            by={f.claim && (extractedBy.find((e) => e.claim === f.claim!.claim)?.name ?? claimedBy.find((c) => c.claim === f.claim!.claim)?.name)}
            agent={!!f.claim && extractedBy.some((e) => e.claim === f.claim!.claim)}
            focused={!!f.claim?.quote && focus === spanOf(doc, f.field)}
            onFocus={() => onFocus(spanOf(doc, f.field))}
            editing={editing === f.field}
            disabled={busy || readOnly}
            onAccept={() => row && f.claim && proposalOf(f.field) && accept.mutate({ slug: row.commitment, field: f.field })}
            onEdit={() => setEditing(f.field)}
            editor={
              editing === f.field && row ? (
                <FieldEditor
                  field={f.field}
                  initial={proposalOf(f.field)}
                  names={names}
                  self={row.commitment}
                  user={user}
                  at={at()}
                  onCancel={() => setEditing(undefined)}
                  onSave={(value: FieldProposal) => replace.mutate({ slug: row.commitment, value }, { onSuccess: () => setEditing(undefined) })}
                />
              ) : null
            }
            names={names}
          />
        ))}
      </ol>

      <WriteError error={error} />

      <footer className="verify-foot">
        <span className={authority ? 'verify-blocked' : undefined}>
          {all && authority
            ? authority
            : all
              ? 'Every field is verified. Activating starts watching its assumptions and dependencies.'
              : `Activate when all ${fields.length} fields are verified.`}
        </span>
        <button type="button" className="btn-action" disabled={!all || busy || readOnly || !!authority} onClick={doActivate} title={readOnly ? why : undefined}>
          {activate.isPending ? 'Activating…' : 'Activate commitment'}
        </button>
      </footer>
    </div>
  )
}

/**
 * Why the decision's mandate cannot authorize this commitment, if it cannot:
 * the capital is above the mandate's limit. Undefined when it can.
 */
function useAuthority(view: CommitmentView, decision: string): string | undefined {
  const { asOf } = useRouteState()
  const decisionMandates = useGatewayQuery('decision_mandates', {}, asOf).data
  const mandates = useGatewayQuery('mandates', {}, asOf).data
  const amount = view.capital?.total
  const m = decisionMandates?.find((x) => x.decision === decision)
  if (!m || amount === undefined || covers(m, amount)) return undefined
  const wider = coveringMandates(mandates ?? [], amount)[0]
  return `${formatMoney(amount)} is above the ${formatMoney(m.limit_amount!)} limit of ${m.mandate} (${m.holder_name}). Correct the rationale and authorization to a mandate that covers it${wider ? `, such as ${wider.mandate} (${wider.holder_name})` : ''}.`
}

const spanOf = (doc: SampleDocument | undefined, field: Field) => doc?.fields.find((p) => p.field === field)?.span

type RowProps = {
  state: FieldState
  proposal?: FieldProposal
  by?: string
  agent: boolean
  focused: boolean
  onFocus: () => void
  editing: boolean
  disabled: boolean
  onAccept: () => void
  onEdit: () => void
  editor: React.ReactNode
  names: ReturnType<typeof useNames>
}

function FieldRow({ state, proposal, by, agent, focused, onFocus, editing, disabled, onAccept, onEdit, editor, names }: RowProps) {
  const { field, status, claim, rejected } = state
  const fromOwner = !!claim && !agent
  return (
    <li className={`vfield is-${status}${focused ? ' is-focused' : ''}`} onMouseEnter={claim?.quote ? onFocus : undefined}>
      <div className="vfield-head">
        <span className="vfield-label">{FIELD_LABEL[field]}</span>
        {status === 'accepted' && !editing && (
          <button type="button" className="btn-quiet is-small vfield-correct" onClick={onEdit} disabled={disabled}>
            Correct
          </button>
        )}
        <span className={`vfield-status is-${status}`}>
          {status === 'accepted' ? (
            <>
              <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1.2 5.4 L4 8 L8.8 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verified
            </>
          ) : status === 'pending' ? (
            'Needs your check'
          ) : (
            'Missing'
          )}
        </span>
      </div>
      {claim && (
        <div className="vfield-value">
          {status === 'pending' && proposal ? <FieldValue value={proposal} names={names} /> : <span className="fv-text">{claim.statement}</span>}
        </div>
      )}
      {claim?.quote && (
        <button type="button" className="vfield-quote" onClick={onFocus}>
          “{claim.quote}”
        </button>
      )}
      {claim && (
        <p className="vfield-by">
          {fromOwner ? `Entered by ${by ?? 'the owner'}` : agent ? `Extracted by ${by ?? 'the agent'}` : ''}
          {claim.status === 'verified' && !fromOwner ? ', verified by its owner' : ''}
          {rejected.length > 0 && ` · replaces the extracted “${rejected.at(-1)!.statement}”`}
        </p>
      )}
      {!editing && status !== 'accepted' && (
        <div className="vfield-actions">
          {status === 'pending' && proposal && (
            <button type="button" className="btn-line is-accept" onClick={onAccept} disabled={disabled}>
              Accept
            </button>
          )}
          <button type="button" className="btn-quiet" onClick={onEdit} disabled={disabled}>
            {status === 'missing' ? `Add ${FIELD_LABEL[field].toLowerCase()}` : 'Reject and correct'}
          </button>
        </div>
      )}
      {editor}
    </li>
  )
}
