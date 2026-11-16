import { useQuery } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import { answer, client, type Me, type Schemas } from '../api.ts'

// Who is signed in, and the demos they can open (docs/PLAN.md §3, phase 2). Each demo is its own
// organization, with its persona and its clock; the one open is named in the URL, #/<org>/…

export type Demo = Schemas['DemoListing']

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => answer(client.GET('/auth/me')), retry: false })

export const useDemos = () =>
  useQuery({ queryKey: ['demos'], queryFn: async () => (await answer(client.GET('/v1/demos'))).demos, retry: false })

/** The demo to open when the URL names none: the first with briefs, which has all of Decision Watch to show. */
export const defaultDemo = (demos: Demo[]): Demo | undefined => demos.find((d) => d.briefs > 0) ?? demos[0]

/** Why the gateway refused the last sign-in, from its redirect back here (`signin_refused`). It is taken off
 *  the address once read, so a reload does not show it again. */
export function takeSigninRefusal(): string | null {
  const url = new URL(window.location.href)
  const why = url.searchParams.get('signin_refused')
  if (why !== null) {
    url.searchParams.delete('signin_refused')
    window.history.replaceState(window.history.state, '', url)
  }
  return why
}

/** Who is signed in, and how to sign out, for every screen under a demo. */
export const SessionContext = createContext<{ me: Me; signOut: () => void } | null>(null)

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession needs a SessionContext')
  return value
}
