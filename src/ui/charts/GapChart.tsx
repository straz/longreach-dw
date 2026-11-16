import { useId } from 'react'
import { Mark, type MarkKind, monthTicks, timeScale } from './marks.tsx'
import './GapChart.css'

// A belief's readings against its lines on a shared date axis
// (docs/PLAN.md §4.3, §4.5): the line dashed, the limit solid, the zone
// between them tinted, the gap between the series and the line filled where
// the series is on the wrong side, the as-of date as an ink rule, and dated
// marks (expected reports, windows) along the foot. Small multiples and the
// belief panel draw the same chart at two sizes.

export type GapPoint = { date: string; value: number; stance: 'supports' | 'weakens' | 'contradicts' }

type Props = {
  points: GapPoint[]
  threshold?: number
  hard?: number
  /** Which side of the threshold holds the belief. */
  good: 'above' | 'below' | 'rising' | 'falling'
  /** The date range of the x axis. */
  start: string
  end: string
  asOf: string
  format: (v: number) => string
  marks?: { date: string; kind: MarkKind; title: string }[]
  width: number
  height: number
  /** Month labels along the foot. */
  axis?: boolean
  label: string
}

const PAD_TOP = 8
const LABEL_W = 64

export default function GapChart({ points, threshold, hard, good, start, end, asOf, format, marks = [], width, height, axis = false, label }: Props) {
  // Unique per chart, so two charts on a page never share a clip region.
  const id = useId()
  const footH = (axis ? 16 : 0) + (marks.length ? 14 : 0)
  const plotW = width - LABEL_W
  const plotB = height - footH - 4
  const values = points.map((p) => p.value)
  const lines = [threshold, hard].filter((v): v is number => v !== undefined)
  let lo = Math.min(...values, ...lines)
  let hi = Math.max(...values, ...lines)
  if (!Number.isFinite(lo)) return <p className="gap-empty">No readings yet</p>
  if (hi === lo) {
    hi += Math.abs(hi) * 0.1 || 1
    lo -= Math.abs(lo) * 0.1 || 1
  }
  const span = hi - lo
  lo -= span * 0.15
  hi += span * 0.15
  const x = timeScale(start, end, 4, plotW - 4)
  const y = (v: number) => PAD_TOP + (1 - (v - lo) / (hi - lo)) * (plotB - PAD_TOP)
  const visible = points.filter((p) => p.date >= start && p.date <= end)
  const path = visible.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const last = visible.at(-1)

  const atLeast = good === 'above'
  const level = (v: number) => Math.max(PAD_TOP, Math.min(plotB, y(v)))
  // The wrong side of the line, for the gap fill; past the limit, for the outer tint.
  const wrong = threshold !== undefined && (good === 'above' || good === 'below') ? (atLeast ? { y0: level(threshold), y1: plotB } : { y0: PAD_TOP, y1: level(threshold) }) : undefined
  const outer = hard !== undefined && wrong ? (atLeast ? { y0: level(hard), y1: plotB } : { y0: PAD_TOP, y1: level(hard) }) : undefined
  const clip = `gap-clip${id.replace(/[^a-zA-Z0-9]/g, '')}`
  const area = threshold !== undefined && visible.length > 1 ? `${path} L${x(last!.date).toFixed(1)},${y(threshold).toFixed(1)} L${x(visible[0].date).toFixed(1)},${y(threshold).toFixed(1)} Z` : undefined

  // Line labels sit right of the plot; keep them from overlapping.
  let tY = threshold !== undefined ? y(threshold) : undefined
  let hY = hard !== undefined ? y(hard) : undefined
  if (tY !== undefined && hY !== undefined && Math.abs(tY - hY) < 12) {
    const mid = (tY + hY) / 2
    const up = tY < hY
    tY = mid + (up ? -6 : 6)
    hY = mid + (up ? 6 : -6)
  }

  return (
    <svg className="gap" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {wrong && <rect className="gap-wrong" x={0} y={wrong.y0} width={plotW} height={Math.max(0, wrong.y1 - wrong.y0)} />}
      {outer && <rect className="gap-outer" x={0} y={outer.y0} width={plotW} height={Math.max(0, outer.y1 - outer.y0)} />}
      {axis &&
        monthTicks(start, end).map((d) => (
          <g key={d}>
            <line className="gap-grid" x1={x(d)} x2={x(d)} y1={PAD_TOP} y2={plotB} />
            <text className="gap-month" x={x(d) + 3} y={height - 3}>
              {new Date(`${d}T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}
            </text>
          </g>
        ))}
      {wrong && area && (
        <>
          <clipPath id={clip}>
            <rect x={0} y={wrong.y0} width={plotW} height={Math.max(0, wrong.y1 - wrong.y0)} />
          </clipPath>
          <path className="gap-fill" d={area} clipPath={`url(#${clip})`} />
        </>
      )}
      {threshold !== undefined && <line className="gap-line" x1={0} x2={plotW} y1={y(threshold)} y2={y(threshold)} />}
      {hard !== undefined && <line className="gap-limit" x1={0} x2={plotW} y1={y(hard)} y2={y(hard)} />}
      {threshold !== undefined && (
        <text className="gap-label" x={plotW + 6} y={tY! + 4}>
          line {format(threshold)}
        </text>
      )}
      {hard !== undefined && (
        <text className="gap-label is-limit" x={plotW + 6} y={hY! + 4}>
          limit {format(hard)}
        </text>
      )}
      <line className="gap-asof" x1={x(asOf)} x2={x(asOf)} y1={PAD_TOP - 4} y2={plotB} />
      {path && <path className="gap-series" d={path} />}
      {visible.map((p) => (
        <circle key={`${p.date}-${p.value}`} className={`gap-point is-${p.stance}`} cx={x(p.date)} cy={y(p.value)} r={p === last ? 3.6 : 2.4}>
          <title>{`${format(p.value)} · ${p.date}`}</title>
        </circle>
      ))}
      {last && threshold === undefined && (
        <text className="gap-label is-value" x={plotW + 6} y={y(last.value) + 4}>
          {format(last.value)}
        </text>
      )}
      {marks
        .filter((m) => m.date >= start && m.date <= end)
        .map((m) => (
          <g key={`${m.kind}-${m.date}-${m.title}`} transform={`translate(${x(m.date) - 5}, ${plotB + 3})`}>
            <title>{m.title}</title>
            <Mark kind={m.kind} size={10} />
          </g>
        ))}
    </svg>
  )
}
