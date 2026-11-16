import './stateVocabulary.css'

// How each state looks, everywhere: list rows, pills, chart markers, legends
// (docs/PLAN.md §6.6). Meaning lives in domain/watchState.ts; this file knows
// only names, glyphs, words and color roles.

export type StateName = 'contradicting' | 'weakening' | 'supported' | 'on_track' | 'untested'

export const STATE_LABEL: Record<StateName, string> = {
  contradicting: 'Contradicted',
  weakening: 'Weakening',
  supported: 'Holds',
  on_track: 'On track',
  untested: 'No evidence yet',
}

/** The color role of a state in charts and figures: moved (attention), weak, or calm. */
export type Tone = 'moved' | 'weak' | 'calm'
export const toneOf = (state: StateName): Tone => (state === 'contradicting' ? 'moved' : state === 'weakening' ? 'weak' : 'calm')

/** The glyph for a state: filled triangle, open down-triangle, check, circle. */
export function StateGlyph({ state, size = 10 }: { state: StateName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 10 10', className: `state-glyph is-${state}`, 'aria-hidden': true } as const
  switch (state) {
    case 'contradicting':
      return (
        <svg {...common}>
          <path d="M5 0.6 L9.6 9.2 H0.4 Z" fill="currentColor" />
        </svg>
      )
    case 'weakening':
      return (
        <svg {...common}>
          <path d="M5 9.2 L9.2 1.2 H0.8 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'supported':
    case 'on_track':
      return (
        <svg {...common}>
          <path d="M1.2 5.4 L4 8 L8.8 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'untested':
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )
  }
}

/** Glyph and word together; color only reinforces them. */
export function StateTag({ state, label }: { state: StateName; label?: string }) {
  return (
    <span className={`state-tag is-${state}`}>
      <StateGlyph state={state} />
      {label ?? STATE_LABEL[state]}
    </span>
  )
}
