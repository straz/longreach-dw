// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest'
import { readStored, writeStored } from './storage.ts'

afterEach(() => localStorage.clear())

test('a value kept is read back, and undefined removes it', () => {
  writeStored('dw:test', { a: 1 })
  expect(readStored('dw:test', {})).toEqual({ a: 1 })
  writeStored('dw:test', undefined)
  expect(localStorage.getItem('dw:test')).toBeNull()
})

test('something unreadable reads as the fallback', () => {
  localStorage.setItem('dw:test', '{not json')
  expect(readStored('dw:test', ['fallback'])).toEqual(['fallback'])
})
