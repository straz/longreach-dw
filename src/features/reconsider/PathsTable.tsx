import type { ReactNode } from 'react'
import { type AvailablePath, type Brief, PATH_KEYS, PATH_LABEL, isAvailable, remainingAfter } from '../../domain/briefs.ts'
import { formatDate, formatMoney } from '../../domain/format.ts'
import { useDirectory } from '../shared/useDirectory.ts'

// The four paths side by side (docs/PLAN.md §2.6): what each means, its cash
// against Continue, what it avoids or defers, what stays exposed, how
// uncertain it is, who must authorize it, and by when.

export default function PathsTable({ brief }: { brief: Brief }) {
  const { mandate } = useDirectory()
  const paths = PATH_KEYS.map((key) => ({ key, path: brief.spec.paths?.[key] }))
  const cells = (row: (p: AvailablePath) => ReactNode) =>
    paths.map(({ key, path }) => (isAvailable(path) ? <td key={key}>{row(path)}</td> : null))
  const money = (v: number) => (v === 0 ? '—' : formatMoney(v))
  return (
    <section className="bsection">
      <h2 className="caps-label">Paths</h2>
      <div className="paths-wrap">
        <table className="paths">
          <thead>
            <tr>
              <th scope="col" className="paths-rowhead" />
              {paths.map(({ key, path }) => (
                <th key={key} scope="col" className={isAvailable(path) ? '' : 'is-unavailable'}>
                  {PATH_LABEL[key]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">What it means</th>
              {paths.map(({ key, path }) =>
                isAvailable(path) ? (
                  <td key={key} className="paths-means">
                    {path.means}
                  </td>
                ) : (
                  <td key={key} rowSpan={9} className="paths-na">
                    <strong>Not available.</strong> {path?.available === false ? path.why : 'Not authored for this brief.'}
                  </td>
                ),
              )}
            </tr>
            <tr>
              <th scope="row">Cash against Continue</th>
              {cells((p) => (
                <>
                  <span className={p.incremental > 0 ? 'is-gain' : p.incremental < 0 ? 'is-cost' : ''}>{p.incremental === 0 ? '—' : formatMoney(p.incremental, { signed: true })}</span>
                  {p.incremental_note && <small>{p.incremental_note}</small>}
                </>
              ))}
            </tr>
            <tr>
              <th scope="row">Avoided</th>
              {cells((p) => money(p.avoided))}
            </tr>
            <tr>
              <th scope="row">Deferred</th>
              {cells((p) => money(p.deferred))}
            </tr>
            <tr>
              <th scope="row">Exposure remaining</th>
              {cells((p) => (
                <>
                  {formatMoney(remainingAfter(brief, p))}
                  {p.deferred > 0 && <small>{formatMoney(p.deferred)} of it later</small>}
                </>
              ))}
            </tr>
            <tr>
              <th scope="row">Uncertainty</th>
              {cells((p) => (
                <>
                  {p.uncertainty}
                  {p.narrows && (
                    <small>
                      Narrows with {p.narrows.source}, {formatDate(p.narrows.date)}
                    </small>
                  )}
                </>
              ))}
            </tr>
            <tr>
              <th scope="row">Authorization</th>
              {cells((p) => {
                const m = mandate(p.mandate)
                return (
                  <>
                    <span className={m?.mine ? 'is-mine' : 'is-other'}>{m?.mine ? 'You' : (m?.holder_name ?? p.mandate)}</span>
                    <small>{p.mandate}</small>
                  </>
                )
              })}
            </tr>
            <tr>
              <th scope="row">For and against</th>
              {cells((p) => (
                <ul className="paths-reasons">
                  {(p.reasons ?? []).map((r) => (
                    <li key={r.statement} className={`is-${r.polarity}`}>
                      {r.statement}
                    </li>
                  ))}
                </ul>
              ))}
            </tr>
            <tr>
              <th scope="row">Deadline</th>
              {cells((p) => (p.deadline ? <span className="is-window">{formatDate(p.deadline)}</span> : '—'))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
