import { expect, test } from 'vitest'
import type { Change } from '../../updates.ts'
import { mergedSummary } from './MergePanel.tsx'

const added = (kind: 'node' | 'edge', type: string, id: string): Change => ({ kind, type, id, op: 'added', before: null, after: {}, written_by: [] })

test('a merge is summed up by what it brought into main', () => {
  const changes = [added('node', 'Commitment', 'move-records'), added('node', 'Belief', 'b1'), added('node', 'Belief', 'b2'), added('node', 'Tripwire', 't1'), added('edge', 'RestsOn', '["move-records","b1"]')]
  expect(mergedSummary('Patient records', changes)).toEqual({ name: 'Patient records', records: 4, links: 1, assumptions: 2, stopRules: 1, commitment: 'move-records' })
})
