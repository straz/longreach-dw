import { type Ask, questions, refKey, shown } from '../../domain/draft/questions.ts'
import { cardLabel } from '../../domain/draft/outline.ts'
import { itemKey, palette } from '../../domain/draft/palette.ts'
import { useDraftState } from './context.ts'

// The coach (docs/21-new-commitment.md, §2c, §4, N7): what is not done, in three kinds shown apart. Unsaved
// cards are not records yet; to do is what a policy will check before a merge; questions are suggestions, a few
// at a time, each answered in place or marked not applicable.

export default function Coach({ dismissed, dismiss }: { dismissed: ReadonlySet<string>; dismiss: (id: string) => void }) {
  const { draft, today, unsaved, model, addCard, linksOf, setEditing, readOnly } = useDraftState()
  const asks = questions(draft, today)
  const { todo, suggested, more } = shown(asks, dismissed)
  const mine = unsaved.cards

  const answer = (a: Ask) => {
    if ('field' in a.answer) {
      setEditing(`${refKey(a.focus)}:${a.answer.field}`)
      document.getElementById(`card-${refKey(a.focus)}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    const key = a.answer.item
    const item = palette(model, a.focus.type, linksOf(a.focus)).find((i) => itemKey(i) === key)
    if (item) addCard(a.focus, item)
  }
  return (
    <aside className="coach" aria-label="What is not done">
      <section className="coach-group">
        <h2>
          To do <span className="coach-count">{todo.length}</span>
        </h2>
        {todo.length === 0 ? <p className="coach-none">Nothing blocks this draft.</p> : <p className="coach-why">These will block merging the update.</p>}
        {todo.map((a) => (
          <Question key={a.id} ask={a} onAnswer={() => answer(a)} disabled={readOnly} />
        ))}
      </section>
      <section className="coach-group">
        <h2>
          Questions <span className="coach-count">{suggested.length + more}</span>
        </h2>
        {suggested.length === 0 && <p className="coach-none">No questions left. Add what you know with ＋ or /.</p>}
        {suggested.map((a) => (
          <Question key={a.id} ask={a} onAnswer={() => answer(a)} onDismiss={() => dismiss(a.id)} disabled={readOnly} />
        ))}
        {more > 0 && <p className="coach-more">{more} more after these</p>}
      </section>
      {mine.length > 0 && (
        <section className="coach-group">
          <h2>
            Unsaved <span className="coach-count">{mine.length}</span>
          </h2>
          <p className="coach-why">Kept in this browser until you save them.</p>
          <ul className="coach-unsaved">
            {mine.map((u) => (
              <li key={u.id}>
                <button type="button" className="btn-link" onClick={() => document.getElementById(`unsaved-${u.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })}>
                  {cardLabel(u.item.type, u.item.kind, u.item.edge)}: {u.text.trim() ? u.text.trim().slice(0, 40) : 'no text yet'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}

function Question({ ask, onAnswer, onDismiss, disabled }: { ask: Ask; onAnswer: () => void; onDismiss?: () => void; disabled?: boolean }) {
  return (
    <div className={`coach-q ${ask.todo ? 'is-todo' : ''}`}>
      <p className="coach-q-text">
        <span className="coach-q-mark" aria-hidden="true">
          {ask.todo ? '●' : '○'}
        </span>
        {ask.text}
      </p>
      {ask.why && <p className="coach-q-why">{ask.why}</p>}
      <div className="coach-q-actions">
        <button type="button" className="btn-line is-small" onClick={onAnswer} disabled={disabled}>
          Answer
        </button>
        {onDismiss && (
          <button type="button" className="btn-quiet is-small" onClick={onDismiss}>
            Not applicable
          </button>
        )}
      </div>
    </div>
  )
}
