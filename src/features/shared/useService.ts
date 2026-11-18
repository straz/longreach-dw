import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGateway } from '../../gateway/react.tsx'
import type { Project } from '../../project.ts'
import { keys } from '../../queryKeys.ts'
import { useFollowWrite } from '../updates/useUpdates.ts'

// Runs a write (src/writes.ts) on the open demo or project, then refetches every answer from its graph, at every
// as-of date: the gateway decides what a write touches, so dw does not guess. A write made while reading a project's
// main started an update, which is worked in from then on.

export function useService<I, R>(service: (project: Project, input: I) => Promise<R>) {
  const gateway = useGateway()
  const queryClient = useQueryClient()
  const follow = useFollowWrite()
  return useMutation({
    mutationFn: (input: I) => service(gateway, input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: keys.graph(gateway.graph) })
      follow(result)
    },
  })
}
