// Sample documents mark the passages a field was extracted from as
// [[span-id]]text[[/]]. This splits the text into plain and quoted segments.

export type Segment = { text: string; span?: string }

const MARK = /\[\[([\w-]+)\]\]([\s\S]*?)\[\[\/\]\]/g

export function segmentsOf(text: string): Segment[] {
  const out: Segment[] = []
  let at = 0
  for (const m of text.matchAll(MARK)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index) })
    out.push({ text: m[2], span: m[1] })
    at = m.index + m[0].length
  }
  if (at < text.length) out.push({ text: text.slice(at) })
  return out
}
