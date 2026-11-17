import { expect, test } from '@playwright/test'
import { open, reseed } from './helpers.ts'

// Every write of test8's browser tests (its e2e/reconsider, verify and watch specs), through tyapi's domain routes,
// each from Fairhaven's seed. Changed from test8 only where dw differs: the demo in the URL, and the slugs the
// gateway chooses.

test.beforeEach(reseed)

test('recording Delay on B2 with the VP infrastructure’s agreement', async ({ page }) => {
  await open(page, 'reconsider/b2')
  const form = page.locator('.record')
  await form.getByLabel('Delay').check()
  await expect(form).toContainText('Needs vp-execute, held by Tom Adeyemi')
  await expect(form.getByLabel('Revisit on')).toHaveValue('2027-05-08')
  await form.getByLabel('Rationale').fill('Keep every option open until the April construction update.')
  await form.getByRole('button', { name: 'Record decision' }).click()

  await expect(page.locator('.brief-recorded')).toContainText('Recorded decision dec-b2-')
  await expect(page.locator('.brief-pill')).toHaveText('Deferred')
  await expect(page.locator('.brief-status')).toContainText('Revisit May 8')
  await expect(page.locator('.decision')).toContainText('vp-execute')
  await expect(page.locator('.blist-group.is-deferred')).toContainText('Polaris Forge 2 energization slips')
  // The avoidable capital is unchanged; the GPU window moved, so the first window is now the H100s'.
  await expect(page.locator('.headline')).toContainText('$509M')
  await expect(page.locator('.headline')).toContainText('Apr 30')

  await page.goto('./#/fairhaven/watch/flags')
  await expect(page.locator('.flag', { hasText: 'Polaris Forge 2 is energized' })).toContainText('Reviewed')
})

test('sending Exit on B2 to the board leaves everything as it was, until the board approves', async ({ page }) => {
  await open(page, 'reconsider/b2')
  const form = page.locator('.record')
  await form.getByLabel('Exit').check()
  await expect(form).toContainText('held by Fairhaven board')
  await form.getByLabel('Rationale').fill('No power date; stop before the GPUs arrive.')
  await form.getByRole('button', { name: 'Send for approval' }).click()
  await expect(page.locator('.brief-pill')).toHaveText('Awaiting approval')
  await expect(page.locator('.decision')).toContainText('awaiting approval')
  await expect(page.locator('.headline')).toContainText('$583M')

  // The board votes; recording its approval enacts the exit.
  await page.getByRole('button', { name: /Record Fairhaven board, finance committee's approval/ }).click()
  await expect(page.locator('.brief-pill')).toHaveText('Decided')
  await expect(page.locator('.headline')).toContainText('$401M')
  await expect(page.locator('.blist-group.is-decided')).toContainText('Polaris Forge 2 energization slips')
})

test('marking a flag reviewed, and agreeing with the agent', async ({ page }) => {
  await open(page, 'watch/flags')
  const h100 = page.locator('.flag', { hasText: 'H100 rental prices' })
  await expect(h100).toContainText('New')
  await h100.getByRole('button', { name: /H100 rental prices/ }).click()
  await page.locator('.bpanel').getByRole('button', { name: 'Mark reviewed' }).click()
  await expect(h100).toContainText('Reviewed')
  await expect(page.locator('.bpanel')).toContainText('Reviewed Mar 31')

  const nvidia = page.locator('.quiet-row', { hasText: 'Nvidia' })
  await expect(nvidia.locator('.agent-note')).toBeVisible()
  await nvidia.locator('.quiet-title').click()
  await page.locator('.bpanel').getByRole('button', { name: 'Agree' }).click()
  await expect(nvidia.locator('.agent-note')).toHaveCount(0)
  await expect(page.locator('.bpanel')).toContainText('Agent · answered')
})

test('import the AFE, correct one field, verify the rest, activate', async ({ page }) => {
  await open(page, 'commitment')
  await expect(page.getByText('$583M')).toBeVisible()

  await page.getByRole('button', { name: 'New commitment' }).click()
  await page.getByRole('button', { name: /Import a document/ }).click()
  await page.getByRole('button', { name: /GB300 cluster storage tier/ }).click()
  await expect(page.getByText('7 fields proposed, none verified yet.')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Create and verify' }).click()

  await expect(page).toHaveURL(/c21-gb300-storage/)
  await expect(page.getByText('0 of 7 fields verified.', { exact: false })).toBeVisible()

  // Correct the capital figure.
  const capital = page.locator('.vfield').filter({ hasText: 'Capital' })
  await capital.getByRole('button', { name: 'Reject and correct' }).click()
  await capital.getByLabel('Amount ($M)').fill('12.6')
  await capital.getByRole('button', { name: 'Save as verified' }).click()
  await expect(capital.getByText(/Entered by Dana Whitlock/)).toBeVisible()

  // Accept every other field.
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Accept', exact: true }).first().click()
    await expect(page.locator('.vfield.is-pending')).toHaveCount(5 - i)
  }
  await page.getByRole('button', { name: 'Activate commitment' }).click()

  await expect(page.getByText('Activated.')).toBeVisible()
  await expect(page.getByText('$596M')).toBeVisible()
})

test('import a document and activate it as extracted', async ({ page }) => {
  await open(page, 'commitment?new=import')
  await page.getByRole('button', { name: /liquid-cooling supply agreement/ }).click()
  await page.getByRole('button', { name: 'Create and verify' }).click({ timeout: 10_000 })
  await expect(page).toHaveURL(/c22-liquid-cooling/)
  for (let i = 7; i > 0; i--) {
    await expect(page.locator('.vfield.is-pending')).toHaveCount(i)
    await page.getByRole('button', { name: 'Accept', exact: true }).first().click()
  }
  await page.getByRole('button', { name: 'Activate commitment' }).click()
  await expect(page.getByText('Activated.')).toBeVisible()
})

test('start blank, then add the promise', async ({ page }) => {
  await open(page, 'commitment')
  await page.getByRole('button', { name: 'New commitment' }).click()
  await page.getByRole('button', { name: /Start blank/ }).click()
  await expect(page).toHaveURL(/c\d+-draft/)
  await expect(page.getByText('7 fields still missing', { exact: false })).toBeVisible()
  const promise = page.locator('.vfield').filter({ hasText: 'Promise' })
  await promise.getByRole('button', { name: 'Add promise' }).click()
  await promise.getByLabel('Title').fill('Second ERCOT interconnection study')
  await promise.getByLabel('What is promised').fill('Commission an independent interconnection study for a second Texas site.')
  await promise.getByRole('button', { name: 'Save as verified' }).click()
  await expect(page.getByRole('heading', { name: 'Second ERCOT interconnection study' })).toBeVisible()
  await expect(page.getByText('6 fields still missing', { exact: false })).toBeVisible()
})

test('activation waits when the amount is above the decision’s mandate', async ({ page }) => {
  await open(page, 'commitment?new=import')
  await page.getByRole('button', { name: /GB300 cluster storage tier/ }).click()
  await page.getByRole('button', { name: 'Create and verify' }).click({ timeout: 10_000 })
  const capital = page.locator('.vfield').filter({ hasText: 'Capital' })
  await capital.getByRole('button', { name: 'Reject and correct' }).click()
  await capital.getByLabel('Amount ($M)').fill('120')
  await capital.getByRole('button', { name: 'Save as verified' }).click()
  for (let i = 6; i > 0; i--) {
    await expect(page.locator('.vfield.is-pending')).toHaveCount(i)
    await page.getByRole('button', { name: 'Accept', exact: true }).first().click()
  }
  await expect(page.locator('.verify-blocked')).toContainText('$120M is above the $100M limit of cfo-commit')
  await expect(page.locator('.verify-blocked')).toContainText('board-approve')
  await expect(page.getByRole('button', { name: 'Activate commitment' })).toBeDisabled()

  // Correcting the authorization to the board releases it.
  const rationale = page.locator('.vfield').filter({ hasText: 'Rationale and authorization' })
  await rationale.getByRole('button', { name: /correct/i }).click()
  await rationale.getByLabel('Authorized under').selectOption('board-approve')
  await rationale.getByRole('button', { name: 'Save as verified' }).click()
  await expect(page.locator('.verify-blocked')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Activate commitment' })).toBeEnabled()
})

test('changes are off while looking back, saying why', async ({ page }) => {
  await open(page, 'reconsider/b2?asof=2027-02-03')
  await expect(page.locator('.record')).toHaveCount(0)
  await page.goto('./#/fairhaven/commitment?asof=2027-02-03')
  await expect(page.getByRole('button', { name: 'New commitment' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'New commitment' })).toHaveAttribute('title', 'Changes are turned off while looking back')
})

test('starting over brings back the seed', async ({ page }) => {
  await open(page, 'commitment/c02-cw-reserved-h100')
  const toggle = page.locator('.watch-toggle')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: /Dana Whitlock, CFO/ }).click()
  await page.getByRole('button', { name: 'Start over in Fairhaven Systems' }).click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
})

test('stopping and resuming watching a commitment', async ({ page }) => {
  await open(page, 'commitment/c02-cw-reserved-h100')
  const toggle = page.locator('.watch-toggle')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
})
