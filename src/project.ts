// The project a call goes to, and the branch of it the visitor works in (tyapi docs/20-projects-and-branches.md,
// P5): an update of theirs, their sandbox of a demo, or main for a visitor who may only read it.

export type Project = { org: string; project: string; branch?: string }

export const MAIN = 'main'

/** Whether a branch is main: read only here, since every change goes to an update or a sandbox. */
export const isMain = (branch: string | undefined) => !branch || branch === MAIN

/** A call's path parameters. */
export const where = (p: Project) => ({ org: p.org, project: p.project })

/** A call's branch parameter: the branch the visitor works in; none for main, which the gateway reads by default. */
export const branchQuery = (p: Project) => (isMain(p.branch) ? {} : { branch: p.branch })
