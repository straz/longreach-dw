import { describe, expect, it } from 'vitest'
import { isAtLeast, meets } from './comparator.ts'

describe('meets', () => {
  it('reads each comparator, at and either side of the line', () => {
    const at = (c: Parameters<typeof meets>[0]) => [9, 10, 11].map((v) => meets(c, v, 10))
    expect(at('ge')).toEqual([false, true, true])
    expect(at('gt')).toEqual([false, false, true])
    expect(at('le')).toEqual([true, true, false])
    expect(at('lt')).toEqual([true, false, false])
    expect(at('eq')).toEqual([false, true, false])
  })
})

describe('isAtLeast', () => {
  it('is true for ge and gt only', () => {
    expect((['ge', 'gt', 'le', 'lt', 'eq', undefined] as const).map(isAtLeast)).toEqual([true, true, false, false, false, false])
  })
})
