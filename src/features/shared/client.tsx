import { type ReactNode, createContext, useContext } from 'react'
import type { BriefSpec } from '../../domain/briefs.ts'
import type { Clock } from '../../domain/clock.ts'
import { setDisplayYear } from '../../domain/format.ts'
import type { SampleDocument } from '../../gateway/documents.ts'
import type { Indicator } from './usePortfolio.ts'

// The demo or project open: who it is signed in as, its clock, and its content besides the records (briefs, sample
// documents, indicators), from tyapi's GET /v1/projects/{org}/{project}/demo for a demo, and none for a project of
// the user's own (app/demo.ts). app/Shell.tsx provides it for the one the URL names; switching changes the URL, and
// with it every value here.

/** The organization a demo or project is opened in, and who works in it. */
export type Client = {
  /** The Party bound by our commitments. */
  org: string
  graph: string
  /** The Party the user works as, owner of claims they enter and holder of their mandates: a demo's persona's; none
   *  yet in a project, where tyapi makes the user's Party on their first write (P4). */
  user: string
  /** Who the user works as: a demo's persona, or the user themselves in a project, by name. */
  who: string
  /** What the footer says about the data. */
  footer: string
  /** A Decision Watch demo, opened as its persona in a sandbox; otherwise a project of the user's own. */
  demo: boolean
}

type Content = { briefs: BriefSpec[]; documents: SampleDocument[]; indicators: Record<string, Indicator> }

/** The demo or project open: what the screens read of it. (app/demo.ts's Heading is what the navbar shows of it.) */
export type Opened = { client: Client; clock: Clock; content: Content }

const OpenedContext = createContext<Opened | null>(null)

export function OpenedProvider({ opened, children }: { opened: Opened; children: ReactNode }) {
  // Dates in its own year are shown without it (domain/format.ts). Set before the screens render.
  setDisplayYear(opened.clock.today.slice(0, 4))
  return <OpenedContext.Provider value={opened}>{children}</OpenedContext.Provider>
}

function useOpened(): Opened {
  const value = useContext(OpenedContext)
  if (!value) throw new Error('a screen needs an OpenedProvider: a demo or project open')
  return value
}

export const useClient = (): Client => useOpened().client
export const useClock = (): Clock => useOpened().clock
export const useDemoContent = (): Content => useOpened().content
/** The documents a demo offers to import, with their extracted fields. */
export const useDocuments = (): SampleDocument[] => useOpened().content.documents
