import { expect, test } from 'vitest'
import { type Change, mergeChanges } from './updates.ts'

const change = (id: string, op: Change['op'], statement = id): Change => ({
  kind: 'node',
  type: 'Belief',
  id,
  op,
  before: null,
  after: { statement },
  written_by: ['p'],
})

test('a later answer replaces a record, adds new ones, and drops one put back as it was', () => {
  const held = [change('a', 'added'), change('b', 'changed', 'first')]
  const later = [change('b', 'changed', 'second'), change('c', 'added'), change('a', 'unchanged')]
  expect(mergeChanges(held, later).map((c) => [c.id, c.after?.statement])).toEqual([
    ['b', 'second'],
    ['c', 'c'],
  ])
})
