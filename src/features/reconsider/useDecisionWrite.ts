import type { Brief } from '../../domain/briefs.ts'
import { type RecordInput, approveDecision, recordDecision } from '../../writes.ts'
import { useRouteState } from '../shared/routeState.ts'
import { useService } from '../shared/useService.ts'
import { useWriteContext } from '../shared/useWriteContext.ts'

// Recording a brief's decision and approving one, then showing the brief again with a confirmation. The brief
// changes state (and the form goes away), so the confirmation rides on the URL. The gateway works out what the
// path touches, its options and who holds its mandate.

export const RECORDED = { decision: 'recorded', count: 'n' } as const

export function useDecisionWrite(brief: Brief) {
  const { go } = useRouteState()
  const { readOnly, why } = useWriteContext()
  const record = useService(recordDecision)
  const approve = useService(approveDecision)

  const done = (result?: { decision?: string | null; written: number }) =>
    result?.decision && go(`/reconsider/${brief.spec.slug}`, { [RECORDED.decision]: result.decision, [RECORDED.count]: result.written })

  return {
    readOnly,
    why,
    pending: record.isPending || approve.isPending,
    error: record.error ?? approve.error,
    record: async (input: Omit<RecordInput, 'brief'>) => done(await record.mutateAsync({ ...input, brief: brief.spec.slug }).catch(() => undefined)),
    approve: async (decision: string) => done(await approve.mutateAsync(decision).catch(() => undefined)),
  }
}
