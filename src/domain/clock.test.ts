import { expect, it } from 'vitest'
import { type Clock, clampAsOf, isLookingBack } from './clock.ts'

const FAIRHAVEN: Clock = { today: '2027-03-31', earliest: '2026-09-28' }
const ALDER: Clock = { today: '2027-11-15', earliest: '2027-03-01' }

it('keeps a date inside the range', () => expect(clampAsOf('2027-02-03', FAIRHAVEN)).toBe('2027-02-03'))

it("clamps to the demo's own range", () => {
  expect(clampAsOf('2020-01-01', FAIRHAVEN)).toBe('2026-09-28')
  expect(clampAsOf('2030-01-01', FAIRHAVEN)).toBe('2027-03-31')
  expect(clampAsOf('2027-06-01', FAIRHAVEN)).toBe('2027-03-31')
  expect(clampAsOf('2027-06-01', ALDER)).toBe('2027-06-01')
})

it('falls back to today for anything that is not a day', () => {
  expect(clampAsOf(null, ALDER)).toBe('2027-11-15')
  expect(clampAsOf('2027-02-30', FAIRHAVEN)).toBe('2027-03-31')
  expect(clampAsOf('soon', FAIRHAVEN)).toBe('2027-03-31')
})

it("looks back before the demo's today only", () => {
  expect(isLookingBack('2027-03-30', FAIRHAVEN)).toBe(true)
  expect(isLookingBack('2027-03-31', FAIRHAVEN)).toBe(false)
  expect(isLookingBack('2027-03-31', ALDER)).toBe(true)
})
