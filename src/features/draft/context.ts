import { createContext, useContext } from 'react'
import type { Item } from '../../domain/draft/palette.ts'
import type { Draft, Ref } from '../../domain/draft/questions.ts'
import type { Fields, Link, Model, NodeType } from '../../entities.ts'
import type { Project } from '../../writes.ts'
import type { Unsaved, useChanges } from './useDraft.ts'

// What every part of the drafting page shares: the model, the draft, how to change it, and which card is focused.

export type DraftState = {
  model: Model
  nodes: Map<string, NodeType>
  draft: Draft
  project: Project
  today: string
  readOnly: boolean
  /** Who signed in as the demo's persona, for the draft's notes. */
  persona: string
  changes: ReturnType<typeof useChanges>
  unsaved: { cards: Unsaved[]; add: (card: Omit<Unsaved, 'id'>) => string; update: (id: string, change: Partial<Unsaved>) => void; remove: (id: string) => void }
  focus: Ref
  setFocus: (ref: Ref) => void
  openPalette: (ref: Ref) => void
  /** A new card from a palette choice on a card, its text typed so far. */
  addCard: (focus: Ref, item: Item, text?: string) => void
  /** The field editor open, as refKey:field, so a question can open it. */
  editing: string | null
  setEditing: (id: string | null) => void
  linksOf: (ref: Ref) => Link[]
  recordOf: (ref: Ref) => Fields | undefined
}

export const DraftContext = createContext<DraftState | null>(null)

export function useDraftState(): DraftState {
  const state = useContext(DraftContext)
  if (!state) throw new Error('a part of the drafting page needs its DraftContext')
  return state
}
