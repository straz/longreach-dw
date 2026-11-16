import { type ReactNode, createContext, useContext } from 'react'
import type { BriefSpec } from '../../domain/briefs.ts'
import type { Clock } from '../../domain/clock.ts'
import type { SampleDocument } from '../../gateway/extractor.ts'
import type { Indicator } from './usePortfolio.ts'

// The demo open: who it is signed in as, its clock, and its content besides the records (briefs, sample
// documents, indicators), from tyapi's GET /v1/projects/{org}/{project}/demo. app/Shell.tsx provides it for the
// demo the URL names; switching demos changes the URL, and with it every value here.

/** The organization the demo is signed in as, and its persona. */
export type Client = {
  /** The Party bound by our commitments. */
  org: string
  graph: string
  /** The persona's Party, owner of claims they enter. */
  user: string
  /** What the footer says about the data. */
  footer: string
}

export type DemoContent = { briefs: BriefSpec[]; documents: SampleDocument[]; indicators: Record<string, Indicator> }

export type Demo = { client: Client; clock: Clock; content: DemoContent }

const DemoContext = createContext<Demo | null>(null)

export function DemoProvider({ demo, children }: { demo: Demo; children: ReactNode }) {
  return <DemoContext.Provider value={demo}>{children}</DemoContext.Provider>
}

function useDemo(): Demo {
  const value = useContext(DemoContext)
  if (!value) throw new Error('a demo screen needs a DemoProvider')
  return value
}

export const useClient = (): Client => useDemo().client
export const useClock = (): Clock => useDemo().clock
export const useDemoContent = (): DemoContent => useDemo().content
/** The documents the demo offers to import, with their extracted fields. */
export const useDocuments = (): SampleDocument[] => useDemo().content.documents
