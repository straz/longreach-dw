// A smoke test of a deployed Decision Watch (docs/PLAN.md §6), as a visitor who is not signed in: the page is the
// app (not GitHub's README page), the API is healthy, it allows the app's origin with credentials, and it asks for
// sign-in. Signing in needs Google, so that stays a person's check.
//
//   node scripts/smoke.ts https://dw.longreach.ai https://api.longreach.ai

const [app, api] = process.argv.slice(2).map((u) => u.replace(/\/+$/, ''))
if (!app || !api) throw new Error('usage: node scripts/smoke.ts <app url> <api url>')

const problems: string[] = []
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`)
  if (!ok) problems.push(what)
}

const page = await fetch(`${app}/`)
const html = await page.text()
check(page.ok && html.includes('<div id="root">'), `${app}/ serves the app`)

const health = await fetch(`${api}/v1/healthz`)
check(health.ok && ((await health.json()) as { status?: string }).status === 'ok', `${api}/v1/healthz is ok`)

const me = await fetch(`${api}/auth/me`, { headers: { origin: app } })
check(me.status === 401, `${api}/auth/me asks a stranger to sign in (got ${me.status})`)
check(me.headers.get('access-control-allow-origin') === app && me.headers.get('access-control-allow-credentials') === 'true', `${api} allows ${app} with credentials`)

if (problems.length) {
  console.error(`${problems.length} check(s) failed`)
  process.exit(1)
}
