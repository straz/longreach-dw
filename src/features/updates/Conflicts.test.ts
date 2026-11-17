import { expect, test } from 'vitest'
import { typed } from './Conflicts.tsx'

test('a resolved value keeps its field’s type, and an empty one is no value', () => {
  expect(typed('1.8', 1.7)).toBe(1.8)
  expect(typed('true', false)).toBe(true)
  expect(typed('', 'text')).toBeNull()
  expect(typed('about 2', 1.7)).toBe('about 2')
  expect(typed('New words', 'Old words')).toBe('New words')
})
