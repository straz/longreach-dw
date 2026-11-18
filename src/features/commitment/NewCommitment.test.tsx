// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import type { GatewayClient } from '../../gateway/client.ts'
import { GatewayProvider } from '../../gateway/react.tsx'
import { DemoProvider, type OpenDemo } from '../shared/client.tsx'
import NewCommitment from './NewCommitment.tsx'

afterEach(() => vi.unstubAllGlobals())

const DEMO: OpenDemo = {
  client: { org: 'fairhaven', graph: 'proj-fairhaven-commitments', user: 'dana', footer: '', demo: true },
  clock: { today: '2027-03-31', earliest: '2026-01-01' },
  content: { briefs: [], documents: [], indicators: {} },
}
const GATEWAY = { graph: 'proj-fairhaven-commitments', org: 'fairhaven', project: 'commitments', branch: 'sandbox-p', query: async () => [] } as unknown as GatewayClient

test('starting blank shows it is under way, and what the gateway said when it refuses', async () => {
  let refuse: (r: Response) => void = () => {}
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => (refuse = resolve))))
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <GatewayProvider client={GATEWAY}>
        <DemoProvider demo={DEMO}>
          <MemoryRouter initialEntries={['/fairhaven/commitment']}>
            <Routes>
              <Route path="/:org/*" element={<NewCommitment />} />
            </Routes>
          </MemoryRouter>
        </DemoProvider>
      </GatewayProvider>
    </QueryClientProvider>,
  )
  const toggle = screen.getByRole('button', { name: /New commitment/ })
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(screen.getByRole('button', { name: /Start blank/ }))
  const starting = await screen.findByRole('button', { name: /Starting…/ })
  expect(starting).toBeDisabled()
  refuse(new Response(JSON.stringify({ error: 'the demo is read-only', code: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json' } }))
  expect(await screen.findByRole('alert')).toHaveTextContent('The graph did not accept the change: the demo is read-only')
  expect(screen.getByRole('button', { name: /Start blank/ })).toBeEnabled()
})
