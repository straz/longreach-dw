// tyapi's API description → vendor/tyapi/openapi.yaml (docs/PLAN.md §5, phase 1). It is written by tyapi's own
// code (`python -m gateway.openapi`), so no gateway needs to be running; TYAPI is the checkout, ../tyapi by
// default. Then `pnpm gen:api` makes the types from it.
//
//   node scripts/pull-api.ts

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = new URL('../', import.meta.url)
const tyapi = resolve(process.env.TYAPI ?? new URL('../tyapi', root).pathname)
const run = (cmd: string, args: string[], cwd: string) => execFileSync(cmd, args, { cwd, encoding: 'utf8' })

const commit = run('git', ['rev-parse', '--short', 'HEAD'], tyapi).trim()
const dirty = run('git', ['status', '--porcelain', '--', 'gateway'], tyapi).trim() !== ''
const description = run('uv', ['run', '-q', 'python', '-m', 'gateway.openapi'], resolve(tyapi, 'gateway'))

mkdirSync(new URL('vendor/tyapi/', root), { recursive: true })
writeFileSync(
  new URL('vendor/tyapi/openapi.yaml', root),
  `# tyapi's API description (\`python -m gateway.openapi\`) at ${commit}${dirty ? ' plus its working tree' : ''}.\n` +
    '# Update with `pnpm api:pull`, then `pnpm gen:api`.\n' +
    description,
)
console.log(`vendor/tyapi/openapi.yaml from tyapi ${commit}${dirty ? ' (working tree)' : ''}`)
