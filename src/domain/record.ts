// A record of the graph as dw names it: by type and slug, and its text.

/** A record, by type and slug. */
export type Ref = { type: string; slug: string }

/** A record's key in maps, element ids and query keys: Type/slug. */
export const refKey = (r: Ref) => `${r.type}/${r.slug}`

/** The fields a record's text can be in, in the order tyapi's entities.text_field looks for them. */
export const TEXT_FIELDS = ['title', 'name', 'statement', 'condition'] as const

/** A record's words: its first text field that has some. */
export const textOf = (record: Record<string, unknown>) => {
  const field = TEXT_FIELDS.find((f) => typeof record[f] === 'string' && record[f])
  return field ? String(record[field]) : undefined
}
