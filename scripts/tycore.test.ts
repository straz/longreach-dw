import { expect, it } from 'vitest'
import { parseQueries, parseSchema } from './tycore.ts'

const SCHEMA = `
// comment
node Commitment @description("A promise.") {
    slug: String @key
    state: enum(proposed, active) @index
    horizon_at: Date?
}
node Belief {
    slug: String @key
    threshold: F64?
}
node Claim {
    slug: String @key
    value: F64?
}
edge RestsOn: Commitment -> Belief {
    necessary: Bool?
}
edge Supports: Claim -> Belief { note: String? }
edge Contradicts: Claim -> Belief { note: String? }
`

it('reads nodes, enums, optional fields and edges', () => {
  const s = parseSchema(SCHEMA)
  expect(s.nodes.map((n) => n.name)).toEqual(['Commitment', 'Belief', 'Claim'])
  expect(s.nodes[0].description).toBe('A promise.')
  expect(s.nodes[0].fields[1]).toMatchObject({ name: 'state', type: { kind: 'enum', values: ['proposed', 'active'] }, optional: false })
  expect(s.nodes[0].fields[2]).toMatchObject({ name: 'horizon_at', optional: true })
  expect(s.edges[0]).toMatchObject({ name: 'RestsOn', from: 'Commitment', to: 'Belief' })
  expect(s.edges[1].fields[0].name).toBe('note')
})

it('types result columns through declared and implied variables', () => {
  const q = parseQueries(
    `
query held($c: String, $as_of: DateTime?) @description("Test.") {
    match {
        $x: Commitment { slug: $c }
        $x $r:restsOn $b
        $k $j:(supports | contradicts) $b
    }
    return { $x.state as state, $r.necessary as necessary, $b.threshold as line, $j.note as note }
}
`,
    parseSchema(SCHEMA),
  )[0]
  expect(q.name).toBe('held')
  expect(q.params).toEqual([
    { name: 'c', type: { kind: 'scalar', name: 'String' }, optional: false },
    { name: 'as_of', type: { kind: 'scalar', name: 'DateTime' }, optional: true },
  ])
  expect(q.columns.map((c) => [c.name, c.optional])).toEqual([
    ['state', false],
    ['necessary', true],
    ['line', true],
    ['note', true],
  ])
})

it('fails loudly on a column it cannot type', () => {
  expect(() => parseQueries('query bad() {\n match { $z restsOn $b }\n return { $q.slug as s }\n}', parseSchema(SCHEMA))).toThrow(
    /cannot type \$q/,
  )
})
