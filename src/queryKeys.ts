// Every query's key, and the one rule for them: a key that starts with a graph id is that graph's answer, and every
// write to the graph refetches it (features/shared/useService.ts invalidates [graph]); every other key is the
// session's, kept across writes: who is signed in, what they can open, a demo's content and sandbox, the model.

export const keys = {
  graph: (graph: string) => [graph] as const,
  updates: (graph: string) => [graph, 'updates'] as const,
  changes: (graph: string, branch: string) => [graph, branch, 'changes'] as const,
  readiness: (graph: string, branch: string) => [graph, branch, 'readiness'] as const,
  draft: (graph: string, branch: string) => [graph, branch, 'draft'] as const,
  uploads: (graph: string, branch: string) => [graph, branch, 'uploads'] as const,
  jobs: (graph: string, branch: string) => [graph, branch, 'jobs'] as const,

  me: ['me'] as const,
  demos: ['demos'] as const,
  projects: ['projects'] as const,
  /** The branch the visitor reads and writes in a demo (Navbar sets it on Start over). */
  sandbox: (graph: string) => ['sandbox', graph] as const,
  demo: (graph: string) => ['demo', graph] as const,
  model: (org: string, project: string) => ['model', org, project] as const,
  consent: (org: string) => ['consent', org] as const,
}
