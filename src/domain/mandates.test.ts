import { expect, it } from 'vitest'
import { coveringMandates, covers } from './mandates.ts'

const cfo = { mandate: 'cfo-commit', power: 'commit' as const, limit_amount: 100, holder_name: 'CFO' }
const board = { mandate: 'board-approve', power: 'approve' as const, limit_amount: undefined, holder_name: 'Board' }
const vp = { mandate: 'vp-execute', power: 'execute' as const, limit_amount: 10, holder_name: 'VP' }

it('covers up to the limit, and any amount without one', () => {
  expect(covers(cfo, 100)).toBe(true)
  expect(covers(cfo, 100.1)).toBe(false)
  expect(covers(board, 5000)).toBe(true)
})

it('lists the mandates that could authorize an amount, narrowest first', () => {
  expect(coveringMandates([board, cfo, vp], 12).map((m) => m.mandate)).toEqual(['cfo-commit', 'board-approve'])
  expect(coveringMandates([board, cfo, vp], 120).map((m) => m.mandate)).toEqual(['board-approve'])
})
