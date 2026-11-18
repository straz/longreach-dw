import { useCallback, useState } from 'react'
import { say } from '../../ui/Notice.tsx'

/** One action at a time, for a control that calls the API: which is running (its id), and what went wrong with the
 *  last, in the API's words. run() answers whether the action finished. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const run = useCallback(async (what: () => Promise<unknown>, id = 'action') => {
    setBusy(id)
    setProblem(null)
    try {
      await what()
      return true
    } catch (e) {
      setProblem(say(e))
      return false
    } finally {
      setBusy(null)
    }
  }, [])
  return { busy, problem, run }
}
