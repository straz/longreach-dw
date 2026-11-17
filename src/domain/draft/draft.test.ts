import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { parseSchema } from '../../../scripts/tycore.ts'
import type { Link, Model } from '../../entities.ts'
import { SECTIONS, cardLabel, sectionOf, stableOrder } from './outline.ts'
import { itemKey, palette } from './palette.ts'
import { type Draft, premortem, questions, shown } from './questions.ts'
import { askedFields, linksFor, textField } from './records.ts'
import { VERBS } from './verbs.ts'

// The model as GET .../model gives it, made from dw's copy of ty-core's schema: each type's fields with an enum's
// values, and each link's ends and most-one limit.
const SOURCE = readFileSync(new URL('../../../vendor/ty-core/schema.pg', import.meta.url), 'utf8')
const MAX = new Map([...SOURCE.matchAll(/^edge (\w+)[^\n]*@card\(\d+\.\.(\d*)\)/gm)].map((m) => [m[1], m[2] ? Number(m[2]) : null]))
const schema = parseSchema(SOURCE)
const MODEL: Model = {
  nodes: schema.nodes.map((n) => ({
    name: n.name,
    description: n.description ?? null,
    key: 'slug',
    fields: n.fields.map((f) => ({ name: f.name, type: f.type.kind === 'scalar' ? f.type.name : f.type.kind, required: !f.optional, is_list: false, key: f.name === 'slug', searchable: false, values: f.type.kind === 'enum' ? f.type.values : null })),
    writable: !['Actor', 'GraphPolicy'].includes(n.name),
    required_links: [],
  })),
  edges: schema.edges.map((e) => ({ name: e.name, from: e.from, to: e.to, description: null, max: MAX.get(e.name) ?? null, key: [], fields: [], writable: e.name !== 'ActsFor' })),
}

const link = (edge: string, direction: 'out' | 'in', slug: string, extra: Partial<Link> = {}): Link => ({ edge, direction, type: 'Party', slug, fields: {}, ...extra })

test('every verb names a link ty-core has, and every kind it offers is one the record can have', () => {
  const edges = new Map(MODEL.edges.map((e) => [e.name, e]))
  const kinds = (type: string) => MODEL.nodes.find((n) => n.name === type)?.fields.find((f) => f.name === 'kind')?.values ?? []
  for (const [name, verb] of Object.entries(VERBS)) {
    const edge = edges.get(name)
    expect(edge, name).toBeDefined()
    for (const o of verb.addOut ?? []) if (o.kind) expect(kinds(edge!.to), `${name} ${o.label}`).toContain(o.kind)
    for (const o of verb.addIn ?? []) if (o.kind) expect(kinds(edge!.from), `${name} ${o.label}`).toContain(o.kind)
  }
})

test("a card offers only what ty-core allows from its type, in the verbs' words", () => {
  const onCommitment = palette(MODEL, 'Commitment')
  expect(onCommitment.map((i) => i.label)).toEqual(expect.arrayContaining(['An assumption it rests on…', 'A risk…', "A party it's owed to…", 'A stop rule…', 'Money it ties up…']))
  const evidence = palette(MODEL, 'Belief').find((i) => i.label === 'Evidence against it…')
  expect(evidence).toMatchObject({ edge: 'Contradicts', direction: 'in', type: 'Claim', kind: 'observation' })
  // A risk is added from the commitment as the source of RiskOf; no belief offers "Who owns it…".
  expect(onCommitment.find((i) => i.edge === 'RiskOf')?.direction).toBe('in')
  expect(palette(MODEL, 'Belief').some((i) => i.edge === 'OwnedBy')).toBe(false)
  // Every section's ＋ is an item its commitment's palette has.
  const keys = new Set(onCommitment.map(itemKey))
  for (const s of SECTIONS) expect(keys, s.id).toContain(s.add)
})

test('a most-one link already made is offered, turned off', () => {
  const owned = palette(MODEL, 'Commitment', [link('OwnedBy', 'out', 'tom')])
  expect(owned.find((i) => i.edge === 'OwnedBy')?.full).toBe(true)
  expect(owned.find((i) => i.edge === 'Owes')?.full).toBe(false)
})

test('links go in the five questions’ sections, and cards are labelled in plain words', () => {
  expect(sectionOf({ edge: 'RestsOn', direction: 'out' })).toBe('rests')
  expect(sectionOf({ edge: 'RiskOf', direction: 'in' })).toBe('change')
  expect(sectionOf({ edge: 'OwnedBy', direction: 'out' })).toBeUndefined()
  expect(cardLabel('Tripwire', 'kill')).toBe('Stop rule')
  expect(cardLabel('Belief', 'assumption')).toBe('Assumption')
  expect(cardLabel('Source', 'document', 'WillInform')).toBe('Report due')
  expect(cardLabel('Claim', 'observation')).toBe('Evidence')
})

test('cards keep their places: new ones go last, gone ones leave no gap', () => {
  expect(stableOrder(['b', 'a'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c'])
  expect(stableOrder(['b', 'a', 'c'], ['c', 'a'])).toEqual(['a', 'c'])
})

const DRAFT: Draft = { slug: 'move-records', record: { title: 'Move records', horizon_at: '2027-09-30T00:00Z' }, links: [], around: {} }

test('a new draft asks who owns it as a to do, and suggests a few questions at a time', () => {
  const asks = questions(DRAFT, '2027-03-31')
  expect(asks[0]).toMatchObject({ id: 'owner', todo: true })
  const { todo, suggested, more } = shown(asks, new Set())
  expect(todo.map((a) => a.id)).toEqual(['owner'])
  expect(suggested.map((a) => a.id)).toEqual(['beliefs', 'tripwire', 'decision'])
  expect(more).toBeGreaterThan(0)
  // Marked not applicable, a question gives way to the next.
  expect(shown(asks, new Set(['tripwire'])).suggested.map((a) => a.id)).toEqual(['beliefs', 'decision', 'risks'])
})

test('each belief is asked for its falsifier and its evidence until it has them', () => {
  const draft: Draft = {
    ...DRAFT,
    links: [link('OwnedBy', 'out', 'tom'), link('RestsOn', 'out', 'vendor-certifies', { type: 'Belief', text: 'The vendor certifies HIPAA by May' })],
    around: { 'Belief/vendor-certifies': { record: { statement: 'x' }, links: [] } },
  }
  const ids = questions(draft, '2027-03-31').map((a) => a.id)
  expect(ids).toContain('falsifier:vendor-certifies')
  expect(ids).toContain('evidence:vendor-certifies')
  expect(ids).not.toContain('owner')
  draft.around['Belief/vendor-certifies'] = { record: { falsifier: 'No audit date by April' }, links: [link('Supports', 'in', 'roadmap', { type: 'Claim' })] }
  expect(questions(draft, '2027-03-31').map((a) => a.id).filter((id) => id.includes('vendor'))).toEqual([])
})

test('the pre-mortem names the horizon, or a year from today', () => {
  expect(premortem('2027-09-30T00:00Z', '2027-03-31')).toBe('Imagine it is September 2027 and this has failed. What happened?')
  expect(premortem(undefined, '2027-03-31')).toBe('Imagine it is March 2028 and this has failed. What happened?')
})


test('a new record is sent with its text, the fields nothing else gives, and the links it needs', () => {
  const node = (name: string) => MODEL.nodes.find((n) => n.name === name)!
  expect(textField(node('Party'))).toBe('name')
  expect(textField(node('Tripwire'))).toBe('condition')
  const risk = palette(MODEL, 'Belief').find((i) => i.edge === 'DrivenBy')!
  // The model here has no defaults; the gateway's gives Claim, Belief and Tripwire theirs.
  expect(askedFields(node('Risk'), risk).map((f) => f.name)).toEqual(['level'])
  expect(linksFor(risk, { type: 'Belief', slug: 'b1' }, 'c1', 'notes-c1')).toEqual([
    { edge: 'DrivenBy', to: 'b1' },
    { edge: 'RiskOf', to: 'c1' },
  ])
  const evidence = palette(MODEL, 'Belief').find((i) => i.edge === 'Supports')!
  expect(linksFor(evidence, { type: 'Belief', slug: 'b1' }, 'c1', 'notes-c1')).toEqual([
    { edge: 'Supports', to: 'b1' },
    { edge: 'ClaimFrom', to: 'notes-c1' },
  ])
  const assumption = palette(MODEL, 'Commitment').find((i) => i.edge === 'RestsOn')!
  expect(linksFor(assumption, { type: 'Commitment', slug: 'c1' }, 'c1', 'notes-c1')).toEqual([{ edge: 'RestsOn', from: 'c1' }])
})
