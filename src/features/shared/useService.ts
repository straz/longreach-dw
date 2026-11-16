import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGateway } from '../../gateway/react.tsx'
import type { Project } from '../../writes.ts'

// Runs a write (src/writes.ts) on the open demo's project, then refetches every answer from its graph, at every
// as-of date: the gateway decides what a write touches, so dw does not guess.

export function useService<I, R>(service: (project: Project, input: I) => Promise<R>) {
  const gateway = useGateway()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: I) => service(gateway, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [gateway.graph] }),
  })
}
