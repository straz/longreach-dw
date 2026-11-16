// Parses the vendored ty-core files (vendor/ty-core/: tyapi's model) into plain data:
// node and edge types with their fields, and stored queries with their
// parameters and typed result columns. Used by gen-model.ts; kept separate so
// it can be tested on small inputs.

export type FieldType =
  | { kind: 'scalar'; name: 'String' | 'Bool' | 'DateTime' | 'Date' | 'F64' | 'I32' }
  | { kind: 'enum'; values: string[] }
  | { kind: 'list'; of: 'String' }

export type Field = { name: string; type: FieldType; optional: boolean; description?: string }
export type NodeDef = { name: string; description?: string; fields: Field[] }
export type EdgeDef = { name: string; from: string; to: string; fields: Field[] }
export type Schema = { nodes: NodeDef[]; edges: EdgeDef[] }

export type Column = { name: string; type: FieldType; optional: boolean; from: { type: string; field: string } }
export type QueryDef = {
  name: string
  description?: string
  params: { name: string; type: FieldType; optional: boolean }[]
  columns: Column[]
}

const SCALARS = new Set(['String', 'Bool', 'DateTime', 'Date', 'F64', 'I32'])

function stripComments(src: string): string {
  return src
    .split('\n')
    .map((line) => line.replace(/^\s*\/\/.*$/, ''))
    .join('\n')
}

function description(annotations: string): string | undefined {
  return /@description\("((?:[^"\\]|\\.)*)"\)/.exec(annotations)?.[1]
}

function parseType(raw: string): { type: FieldType; optional: boolean } {
  const optional = raw.endsWith('?')
  const t = optional ? raw.slice(0, -1) : raw
  const en = /^enum\(([^)]*)\)$/.exec(t)
  if (en) return { type: { kind: 'enum', values: en[1].split(',').map((v) => v.trim()) }, optional }
  if (t === '[String]') return { type: { kind: 'list', of: 'String' }, optional }
  if (SCALARS.has(t)) return { type: { kind: 'scalar', name: t as 'String' }, optional }
  throw new Error(`Unknown field type: ${raw}`)
}

// One `name: Type @annotations` line inside a block; other lines (@key, @range) are skipped.
function parseFields(body: string): Field[] {
  const fields: Field[] = []
  for (const line of body.split('\n')) {
    const m = /^\s*([a-z_][a-z0-9_]*):\s*(enum\([^)]*\)\??|\[String\]\??|[A-Za-z0-9]+\??)(.*)$/.exec(line)
    if (!m) continue
    const { type, optional } = parseType(m[2])
    fields.push({ name: m[1], type, optional, description: description(m[3]) })
  }
  return fields
}

export function parseSchema(src: string): Schema {
  const text = stripComments(src)
  const nodes: NodeDef[] = []
  const edges: EdgeDef[] = []
  for (const m of text.matchAll(/^node\s+(\w+)([^{]*)\{([\s\S]*?)^\}/gm)) {
    nodes.push({ name: m[1], description: description(m[2]), fields: parseFields(m[3]) })
  }
  for (const m of text.matchAll(/^edge\s+(\w+):\s*(\w+)\s*->\s*(\w+)[^{\n]*(\{([\s\S]*?)\})?/gm)) {
    edges.push({ name: m[1], from: m[2], to: m[3], fields: m[5] ? parseFields(m[5]) : [] })
  }
  return { nodes, edges }
}

const lowerFirst = (s: string) => s[0].toLowerCase() + s.slice(1)

export function parseQueries(src: string, schema: Schema): QueryDef[] {
  const text = stripComments(src)
  const nodes = new Map(schema.nodes.map((n) => [n.name, n]))
  const edgesByVerb = new Map(schema.edges.map((e) => [lowerFirst(e.name), e]))
  const out: QueryDef[] = []

  for (const m of text.matchAll(/^query\s+(\w+)\(([^)]*)\)([^{]*)\{([\s\S]*?)^\}/gm)) {
    const [, name, rawParams, annotations, body] = m
    const params = rawParams
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const pm = /^\$(\w+):\s*(.+)$/.exec(p)
        if (!pm) throw new Error(`${name}: bad parameter ${p}`)
        return { name: pm[1], ...parseType(pm[2]) }
      })

    // Variable → node or edge definition. Declared types first, then types
    // implied by traversals (`$a verb $b`, `$a $x:verb $b`), repeated until stable.
    const vars = new Map<string, NodeDef | EdgeDef>()
    for (const d of body.matchAll(/\$(\w+):\s*([A-Z]\w*)/g)) {
      const node = nodes.get(d[2])
      if (node) vars.set(d[1], node)
    }
    // A verb may be an alternation, `(supports | contradicts)`; its edges share
    // endpoints and fields, so the first one types the variables.
    const traversals = [...body.matchAll(/\$(\w+)\s+(?:\$(\w+):)?([a-z]\w*|\([a-z\w\s|]*\))(?:\{[^}]*\})?\s+\$(\w+)/g)]
    for (let changed = true; changed; ) {
      changed = false
      for (const [, a, x, verb, b] of traversals) {
        const edge = edgesByVerb.get(verb.replace(/^\(\s*/, '').split(/[\s|)]/)[0])
        if (!edge) continue
        for (const [v, def] of [
          [a, nodes.get(edge.from)],
          [b, nodes.get(edge.to)],
          [x, edge],
        ] as const) {
          if (v && def && !vars.has(v)) {
            vars.set(v, def)
            changed = true
          }
        }
      }
    }

    const ret = /return\s*\{([^}]*)\}/.exec(body)
    if (!ret) throw new Error(`${name}: no return clause`)
    const columns = ret[1].split(',').map((col) => {
      const cm = /^\s*\$(\w+)\.(\w+)\s+as\s+(\w+)\s*$/.exec(col)
      if (!cm) throw new Error(`${name}: cannot read column "${col.trim()}"`)
      const def = vars.get(cm[1])
      if (!def) throw new Error(`${name}: cannot type $${cm[1]}`)
      const field = def.fields.find((f) => f.name === cm[2])
      if (!field) throw new Error(`${name}: ${def.name} has no field ${cm[2]}`)
      return { name: cm[3], type: field.type, optional: field.optional, from: { type: def.name, field: field.name } }
    })
    out.push({ name, description: description(annotations), params, columns })
  }
  return out
}
