import { Fragment, type ReactNode, useEffect, useRef } from 'react'
import { segmentsOf } from '../../domain/document.ts'
import './DocumentView.css'

// A sample document, set as a page: headings, paragraphs, bold and italic,
// with the passages fields were extracted from underlined, and the one in
// focus highlighted and scrolled into view.

type Props = {
  text: string
  /** Span ids extracted so far; others stay plain. */
  shown?: ReadonlySet<string>
  /** The span to highlight. */
  focus?: string
  onSpan?: (span: string) => void
}

export default function DocumentView({ text, shown, focus, onSpan }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Scroll only the document's own scrolling container: scrollIntoView would
  // also scroll the page, moving whatever the reader is pointing at.
  useEffect(() => {
    const root = ref.current
    const mark = focus ? root?.querySelector<HTMLElement>(`[data-span="${focus}"]`) : null
    if (!root || !mark) return
    let box: HTMLElement | null = root.parentElement
    while (box && getComputedStyle(box).overflowY !== 'auto' && getComputedStyle(box).overflowY !== 'scroll') box = box.parentElement
    if (!box) return
    const top = mark.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - box.clientHeight / 3
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [focus])

  // Paragraph by paragraph; markers never cross a blank line.
  const blocks = text.trim().split(/\n\s*\n/)
  return (
    <div className="docview" ref={ref}>
      {blocks.map((block, i) => {
        const heading = /^(#{1,3})\s+(.*)$/s.exec(block)
        const body = heading ? heading[2] : block
        const content = segmentsOf(body).map((seg, j) => {
          const inner = inline(seg.text)
          if (!seg.span) return <Fragment key={j}>{inner}</Fragment>
          const visible = !shown || shown.has(seg.span)
          return (
            <mark
              key={j}
              data-span={seg.span}
              className={`docview-span${visible ? ' is-found' : ''}${focus === seg.span ? ' is-focus' : ''}`}
              onClick={visible && onSpan ? () => onSpan(seg.span!) : undefined}
            >
              {inner}
            </mark>
          )
        })
        if (heading) {
          const Tag = heading[1].length === 1 ? 'h1' : 'h2'
          return (
            <Tag key={i} className="docview-heading">
              {content}
            </Tag>
          )
        }
        return <p key={i}>{content}</p>
      })}
    </div>
  )
}

/** **bold** and *italic*, and line breaks. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\n/g
  let at = 0
  let k = 0
  for (const m of text.matchAll(re)) {
    if (m.index > at) out.push(text.slice(at, m.index))
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>)
    else if (m[2]) out.push(<em key={k++}>{m[2]}</em>)
    else out.push(<br key={k++} />)
    at = m.index + m[0].length
  }
  if (at < text.length) out.push(text.slice(at))
  return out
}
