import './CapitalBar.css'

// Sunk · unspent · avoidable as one bar. The avoidable part is the right end
// of the unspent part. `scale` lets several bars share one dollar axis.

type Props = {
  sunk: number
  unspent: number
  avoidable: number
  /** The amount the full width stands for; defaults to this bar's total. */
  scale?: number
  height?: number
  tone?: 'moved' | 'calm'
  label?: string
}

export default function CapitalBar({ sunk, unspent, avoidable, scale, height = 10, tone = 'calm', label }: Props) {
  const total = sunk + unspent
  const full = Math.max(scale ?? total, total, 1)
  const pct = (v: number) => `${(v / full) * 100}%`
  const fixed = Math.max(0, unspent - avoidable)
  return (
    <div className={`capbar tone-${tone}`} style={{ height }} role="img" aria-label={label}>
      <span className="capbar-sunk" style={{ width: pct(sunk) }} />
      <span className="capbar-unspent" style={{ width: pct(fixed) }} />
      <span className="capbar-avoidable" style={{ width: pct(avoidable) }} />
    </div>
  )
}
