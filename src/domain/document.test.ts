import { describe, expect, it } from 'vitest'
import { segmentsOf } from './document.ts'

describe('segmentsOf', () => {
  it('splits marked passages from plain text', () => {
    expect(segmentsOf('We commit [[s1]]$4M[[/]] by [[s-2]]June\n2027[[/]].')).toEqual([
      { text: 'We commit ' },
      { text: '$4M', span: 's1' },
      { text: ' by ' },
      { text: 'June\n2027', span: 's-2' },
      { text: '.' },
    ])
  })

  it('keeps unmarked text whole, and empty text empty', () => {
    expect(segmentsOf('plain')).toEqual([{ text: 'plain' }])
    expect(segmentsOf('')).toEqual([])
    expect(segmentsOf('[[a]]all[[/]]')).toEqual([{ text: 'all', span: 'a' }])
  })
})
