import { describe, expect, it } from 'vitest'
import { addDays, compareDates, dayOf, daysBetween } from './dates.ts'

describe('dates', () => {
  it('dayOf takes the day of a moment', () => {
    expect(dayOf('2027-03-31T23:59:59.999Z')).toBe('2027-03-31')
    expect(dayOf('2027-03-31T00:00:00.000Z')).toBe('2027-03-31')
  })

  it('addDays crosses months, years and leap days in UTC', () => {
    expect(addDays('2027-03-31', 1)).toBe('2027-04-01')
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28')
  })

  it('daysBetween counts whole days, negative backwards, and reads a moment as its day', () => {
    expect(daysBetween('2027-03-31', '2027-09-27')).toBe(180)
    expect(daysBetween('2027-04-01', '2027-03-31')).toBe(-1)
    expect(daysBetween('2027-03-31T23:00:00.000Z', '2027-04-01')).toBe(1)
  })

  it('compareDates sorts oldest first with missing dates last', () => {
    expect(['2027-05-01', undefined, '2027-04-01', undefined].sort(compareDates)).toEqual(['2027-04-01', '2027-05-01', undefined, undefined])
    expect(compareDates('2027-04-01', '2027-04-01')).toBe(0)
  })
})
