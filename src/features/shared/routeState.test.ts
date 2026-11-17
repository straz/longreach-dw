import { expect, test } from 'vitest'
import { tabOf, withParams } from './routeState.ts'

test('withParams adds the parameters given, leaving out undefined ones', () => {
  expect(withParams('/commitment/c3', { view: 'map', n: 2, skip: undefined })).toBe('/commitment/c3?view=map&n=2')
  expect(withParams('/watch')).toBe('/watch')
  expect(withParams('/watch', { skip: undefined })).toBe('/watch')
})

test('withParams keeps a query the path carries, and a parameter given replaces one of the same name', () => {
  expect(withParams('/watch?asof=2027-01-05&row=b1', { row: 'b2' })).toBe('/watch?asof=2027-01-05&row=b2')
  expect(withParams('/reconsider/x', { q: 'a b&c' })).toBe('/reconsider/x?q=a+b%26c')
})

test("tabOf reads the segment after the demo's, and falls back to the first tab", () => {
  expect(tabOf('/fairhaven/watch')).toBe('watch')
  expect(tabOf('/fairhaven/reconsider/b-renew')).toBe('reconsider')
  expect(tabOf('/fairhaven')).toBe('commitment')
  expect(tabOf('/fairhaven/elsewhere')).toBe('commitment')
  expect(tabOf('/')).toBe('commitment')
})
