import { useQuery } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import { answer, client, type Me, type Schemas } from '../api.ts'
import { fromApi } from '../wire.ts'

// Who is signed in, the demos they can open (docs/PLAN.md §3, phase 2), and the projects of their own orgs (tyapi
// docs/20, P1). Each demo is its own organization, with its persona and its clock, named in the URL #/<org>/…; a
// project is opened as the user, at today's date, named #/p/<org>/<project>/…

/** A demo as the user menu lists it, its dates as days (src/wire.ts). */
export type DemoListing = Schemas['DemoListing']

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => answer(client.GET('/auth/me')) })

/** How to name who is signed in: their email, or their name when they have none. */
export const whoIs = (me: Me) => me.email ?? me.display_name

export const useDemos = () =>
  useQuery({ queryKey: ['demos'], queryFn: async () => fromApi((await answer(client.GET('/v1/demos'))).demos) })

/** A project the user can open (tyapi docs/20, P1), with their role and its state. */
export type ProjectListing = Schemas['ProjectOut']

/** The projects the user can open, and the orgs they may make one in. Polled while one is being made. */
export const useProjects = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: () => answer(client.GET('/v1/projects')),
    refetchInterval: (q) => (q.state.data?.projects.some((p) => p.state === 'creating') ? 2000 : false),
  })

/** Whether a role may change a project: write, maintain or admin. */
export const writes = (role: string | null | undefined) => role === 'write' || role === 'maintain' || role === 'admin'

/** The demo to open when the URL names none: the first with briefs, which has all of Decision Watch to show. */
export const defaultDemo = (demos: DemoListing[]): DemoListing | undefined => demos.find((d) => d.briefs > 0) ?? demos[0]

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
