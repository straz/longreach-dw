import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createHashRouter, RouterProvider } from 'react-router'
import { ApiError, answer, client as api, type Me, signInUrl } from '../api.ts'
import { Card, Problem, say } from './Card.tsx'
import { routes } from './routes.tsx'
import { SessionContext, takeSigninRefusal, useMe } from './session.ts'

// Decision Watch (docs/PLAN.md §3). The gateway's session says who is signed in: signing in goes to the gateway,
// which signs in with Google, refuses anyone who is not a tyapi user, and sends the browser back here, with the
// reason when it refused. Decision Watch's visitors (tyapi demos/visitors.yaml) are the users who may open its
// demos. Signed in, the URL names the demo open (#/<org>/…), and test8's screens read its graph (app/routes.tsx).

export const makeQueryClient = () => new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })

export default function App({ queryClient }: { queryClient?: QueryClient }) {
  // Made once: a default parameter would make a new client, and lose the cache, on every render.
  const [client] = useState(() => queryClient ?? makeQueryClient())
  return (
    <QueryClientProvider client={client}>
      <Gate />
    </QueryClientProvider>
  )
}

function Gate() {
  const [refusal] = useState(takeSigninRefusal)
  const me = useMe()
  if (me.isPending) return <Card lede="Checking who is signed in…" />
  if (me.error) {
    if (me.error instanceof ApiError && me.error.status === 401) {
      return (
        <Card lede="Sign in with Google to open the demo.">
          {refusal && (
            <p className="signin-problem" role="alert">
              Longreach did not sign you in: {refusal}
            </p>
          )}
          <a className="btn-action signin-button" href={signInUrl(window.location.href)}>
            Sign in with Google
          </a>
        </Card>
      )
    }
    return <Problem what="answer" error={me.error} onRetry={() => void me.refetch()} />
  }
  return <Signed me={me.data} />
}

function Signed({ me }: { me: Me }) {
  const queryClient = useQueryClient()
  const [router] = useState(() => createHashRouter(routes))
  const [problem, setProblem] = useState<string | null>(null)
  const signOut = async () => {
    setProblem(null)
    try {
      await answer(api.POST('/auth/logout'))
      // Forget every answer but who is signed in, then ask that again: its 401 shows the sign-in.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    } catch (e) {
      setProblem(say(e))
    }
  }
  if (problem) return <Problem what="sign you out" error={problem} onRetry={() => void signOut()} />
  return (
    <SessionContext.Provider value={{ me, signOut: () => void signOut() }}>
      <RouterProvider router={router} />
    </SessionContext.Provider>
  )
}
