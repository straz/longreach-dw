import { describe, expect, it } from 'vitest'
import { daysAway, formatDate, formatMetric, formatMoney, setDisplayYear } from './format.ts'

describe('formatMoney', () => {
  it.each([
    [359, '$359M'],
    [1350, '$1.35B'],
    [4.2, '$4.2M'],
    [10, '$10M'],
    [9.96, '$10M'],
    [40.8, '$40.8M'],
    [58.4, '$58.4M'],
    [38, '$38M'],
    [99.96, '$100M'],
    [3, '$3M'],
    [2000, '$2B'],
    [1304, '$1.30B'],
  ])('%s → %s', (m, out) => expect(formatMoney(m)).toBe(out))

  it('uses a true minus and an explicit plus when asked', () => {
    expect(formatMoney(-17)).toBe('−$17M')
    expect(formatMoney(13, { signed: true })).toBe('+$13M')
    expect(formatMoney(0, { signed: true })).toBe('$0M')
  })
})

describe('formatDate', () => {
  it('omits the year inside the demo year', () => expect(formatDate('2027-04-15')).toBe('Apr 15'))
  it("follows the open demo's year", () => {
    setDisplayYear('2028')
    expect([formatDate('2028-01-02'), formatDate('2027-12-30')]).toEqual(['Jan 2', 'Dec 30, 2027'])
    setDisplayYear('2027')
  })
  it('adds it otherwise', () => expect(formatDate('2028-01-02')).toBe('Jan 2, 2028'))
  it('adds it when asked', () => expect(formatDate('2027-03-31', { long: true })).toBe('Mar 31, 2027'))
})

describe('daysAway', () => {
  it('counts within 90 days', () => expect(daysAway('2027-04-15', '2027-03-31')).toBe('(15 days)'))
  it('is silent beyond 90 days or in the past', () => {
    expect(daysAway('2027-09-30', '2027-03-31')).toBe('')
    expect(daysAway('2027-03-01', '2027-03-31')).toBe('')
  })
})

describe('formatMetric', () => {
  it('prints with the indicator’s decimals, affixes and thousands separators', () => {
    expect(formatMetric(1.47, { decimals: 2, prefix: '$' })).toBe('$1.47')
    expect(formatMetric(1172, { decimals: 0, prefix: '$' })).toBe('$1,172')
    expect(formatMetric(76.8, { decimals: 1, suffix: '%' })).toBe('76.8%')
  })
})
