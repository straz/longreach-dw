// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, test, vi } from 'vitest'
import type { IsoDate, QueryName } from '../model/generated.ts'
import type { GatewayClient } from './client.ts'
import { GatewayProvider, useGatewayQuery, useQueryRows, useSettled } from './react.tsx'

// A gateway whose answers the test gives one at a time, so it can look between them.
function fakeGateway() {
  const asked: { name: QueryName; asOf?: IsoDate; resolve: (rows: unknown[]) => void }[] = []
  const query = vi.fn((name: QueryName, _params: unknown, opts?: { asOf?: IsoDate }) => new Promise<unknown[]>((resolve) => asked.push({ name, asOf: opts?.asOf, resolve })))
  const client = { graph: 'proj-test', org: 'test', project: 'commitments', branch: 'main', query } as unknown as GatewayClient
  const answer = async (name: QueryName, asOf: IsoDate, rows: unknown[]) => {
    await waitFor(() => expect(asked.some((a) => a.name === name && a.asOf === asOf)).toBe(true))
    await act(async () => asked.find((a) => a.name === name && a.asOf === asOf)!.resolve(rows))
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <GatewayProvider client={client}>{children}</GatewayProvider>
    </QueryClientProvider>
  )
  return { query, answer, wrapper }
}

const NAMES = ['mandates', 'commitments'] as const
const JAN = '2027-01-05'
const FEB = '2027-02-05'

test('useQueryRows gives rows only when every answer is for the date asked, keeping the last ones until then', async () => {
  const { answer, wrapper } = fakeGateway()
  const { result, rerender } = renderHook(({ asOf }) => useQueryRows(NAMES, asOf), { wrapper, initialProps: { asOf: JAN } })
  expect(result.current.rows).toBeUndefined()
  await answer('mandates', JAN, [{ m: 'jan' }])
  expect(result.current.rows).toBeUndefined()
  expect(result.current.settled).toBe(false)
  await answer('commitments', JAN, [{ c: 'jan' }])
  await waitFor(() => expect(result.current.settled).toBe(true))
  const january = result.current.rows
  expect(january).toEqual({ mandates: [{ m: 'jan' }], commitments: [{ c: 'jan' }] })

  rerender({ asOf: FEB })
  expect(result.current.settled).toBe(false)
  expect(result.current.isUpdating).toBe(true)
  expect(result.current.rows).toBe(january)
  await answer('mandates', FEB, [{ m: 'feb' }])
  // Half of February is in; the screen still shows all of January, the same object.
  expect(result.current.settled).toBe(false)
  expect(result.current.rows).toBe(january)
  await answer('commitments', FEB, [{ c: 'feb' }])
  await waitFor(() => expect(result.current.settled).toBe(true))
  expect(result.current.rows).toEqual({ mandates: [{ m: 'feb' }], commitments: [{ c: 'feb' }] })
})

test('useGatewayQuery keeps the previous answer, marked a placeholder, while a new as-of date loads', async () => {
  const { answer, wrapper } = fakeGateway()
  const { result, rerender } = renderHook(({ asOf }) => useGatewayQuery('mandates', {}, asOf), { wrapper, initialProps: { asOf: JAN } })
  await answer('mandates', JAN, [{ m: 'jan' }])
  await waitFor(() => expect(result.current.data).toEqual([{ m: 'jan' }]))
  rerender({ asOf: FEB })
  expect(result.current.data).toEqual([{ m: 'jan' }])
  expect(result.current.isPlaceholderData).toBe(true)
  await answer('mandates', FEB, [{ m: 'feb' }])
  await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
  expect(result.current.data).toEqual([{ m: 'feb' }])
})

test('useGatewayQuery with enabled false asks nothing and has no data', async () => {
  const { query, wrapper } = fakeGateway()
  const { result } = renderHook(() => useGatewayQuery('mandates', {}, JAN, { enabled: false }), { wrapper })
  await act(async () => {})
  expect(query).not.toHaveBeenCalled()
  expect(result.current.data).toBeUndefined()
})

test('useSettled passes a settled value through and otherwise keeps the last settled one', () => {
  const { result, rerender } = renderHook<string | undefined, { value?: string; settled: boolean }>(({ value, settled }) => useSettled(value, settled), { initialProps: { value: 'a', settled: false } })
  expect(result.current).toBeUndefined()
  rerender({ value: 'b', settled: true })
  expect(result.current).toBe('b')
  rerender({ value: 'c', settled: false })
  expect(result.current).toBe('b')
  rerender({ value: undefined, settled: true })
  expect(result.current).toBe('b')
})
