import type { Tone } from '../stateVocabulary.tsx'
import './Sparkline.css'

// A belief's readings against its lines: the threshold as a rule, the zone
// between it and the hard line tinted, the newest reading marked. Small
// enough for a table row (docs/PLAN.md §4.2, 210 px).

export type SparkPoint = { x: string; y: number }

type Props = {
  points: SparkPoint[]
  threshold?: number
  hard?: number
  /** Which side of the threshold holds the belief. */
  good: 'above' | 'below' | 'rising' | 'falling'
  /** State of the newest point, for its color. */
  tone?: Tone
  width?: number
  height?: number
  label?: string
}

export default function Sparkline({ points, threshold, hard, good, tone = 'calm', width = 168, height = 32, label }: Props) {
  if (points.length === 0) return <span className="spark-empty">No readings</span>
  const pad = 4
  const ys = points.map((p) => p.y)
  const lines = [threshold, hard].filter((v): v is number => v !== undefined)
  let lo = Math.min(...ys, ...lines)
  let hi = Math.max(...ys, ...lines)
  if (hi === lo) {
    hi += 1
    lo -= 1
  }
  const span = hi - lo
  lo -= span * 0.12
  hi += span * 0.12
  const t0 = Date.parse(points[0].x)
  const t1 = Date.parse(points.at(-1)!.x)
  const x = (d: string) => (t1 === t0 ? width / 2 : pad + ((Date.parse(d) - t0) / (t1 - t0)) * (width - pad * 2 - 4))
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (height - pad * 2)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')
  const last = points.at(-1)!

  // The weakening zone sits between the threshold and the hard line; past the hard line is the contradicting side.
  const zone = threshold !== undefined && hard !== undefined ? [y(threshold), y(hard)].sort((a, b) => a - b) : undefined
  const badSide =
    hard !== undefined && (good === 'above' || good === 'below')
      ? good === 'above'
        ? { from: y(hard), to: height }
        : { from: 0, to: y(hard) }
      : undefined

  return (
    <svg className={`spark tone-${tone}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {badSide && <rect className="spark-bad" x={0} y={badSide.from} width={width} height={Math.max(0, badSide.to - badSide.from)} />}
      {zone && <rect className="spark-zone" x={0} y={zone[0]} width={width} height={zone[1] - zone[0]} />}
      {threshold !== undefined && <line className="spark-threshold" x1={0} x2={width} y1={y(threshold)} y2={y(threshold)} />}
      <path className="spark-line" d={path} />
      <circle className="spark-last" cx={x(last.x)} cy={y(last.y)} r={3} />
    </svg>
  )
}
