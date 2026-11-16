import { expect, test } from '@playwright/test'
import { open, reseed } from './helpers.ts'

// test8's five-minute demo (its docs/PLAN.md §9, e2e/walkthrough.spec.ts), end to end on Fairhaven, as of Mar 31
// 2027, against tyapi.

test.beforeEach(reseed)

test('the demo walkthrough', async ({ page }) => {
  const headline = page.locator('.headline')

  // 1. Open on Commit: the answer first; the first window opens the GB300 order.
  await open(page, 'commitment')
  await expect(headline).toContainText('$1.35B')
  await expect(headline).toContainText('$583M')
  await expect(headline).toContainText('$509M')
  await expect(headline).toContainText('in 15 days')
  await page.locator('.headline-window').click()
  await expect(page).toHaveURL(/commitment\/c06-nvidia-gb300-po/)
  await expect(page.locator('.cdetail')).toContainText('Free delivery deferral')

  // 2. Needs attention: six, by window; the reserved H100s with its window and tripwire.
  await expect(page.locator('.clist-group.is-attention .clist-row')).toHaveCount(6)
  await page.locator('.clist-row', { hasText: '8,000 reserved H100s' }).click()
  await expect(page.locator('.cdetail')).toContainText('$323M')
  await expect(page.locator('.cdetail')).toContainText('Apr 30')
  await expect(page.locator('.cdetail')).toContainText('11.9%')

  // 3. Watch: four flags, five that moved without one; the H100 flag in full.
  await page.getByRole('tab', { name: /Watch/ }).click()
  await expect(page.locator('.flag')).toHaveCount(4)
  await expect(page.locator('.flags-view .quiet').first().locator('.quiet-row')).toHaveCount(5)
  await page.locator('.flag', { hasText: 'H100 rental prices' }).locator('.flag-title').click()
  const panel = page.locator('.bpanel')
  await expect(panel).toContainText('Why it is a flag')
  await expect(panel.locator('svg.gap')).toBeVisible()
  await expect(panel).toContainText('$323M avoidable')

  // 4. As-of: nothing on Jan 1; the restudy, the first crossing, the breach.
  for (const [asOf, flags, moved] of [
    ['2027-01-01', 0, '$0M'],
    ['2027-01-23', 1, '$170M'],
    ['2027-02-03', 2, '$188M'],
    ['2027-03-03', 4, ''],
  ] as const) {
    await page.goto(`./#/fairhaven/watch/flags?asof=${asOf}`)
    await expect(page.locator('.looking-back')).toBeVisible()
    await expect(page.locator('.flag')).toHaveCount(flags)
    if (moved) await expect(headline).toContainText(moved)
  }
  await page.locator('.looking-back').getByRole('button', { name: /Back to Mar 31/ }).click()
  await expect(page.locator('.looking-back')).toHaveCount(0)

  // 5. Reconsider B2: record Delay with a May 8 revisit, under Tom Adeyemi's mandate.
  await page.getByRole('tab', { name: /Reconsider/ }).click()
  await expect(page).toHaveURL(/reconsider\/b2/)
  await expect(page.locator('.paths')).toBeVisible()
  await page.locator('.record').getByLabel('Delay').check()
  await page.locator('.record').getByLabel('Rationale').fill('Keep every option open until the April construction update.')
  await page.locator('.record').getByRole('button', { name: 'Record decision' }).click()
  await expect(page.locator('.brief-recorded')).toContainText('records written')
  await page.goto('./#/fairhaven/watch/flags')
  await expect(page.locator('.flag', { hasText: 'Polaris Forge 2 is energized' })).toContainText('Reviewed')
  await page.goto('./#/fairhaven/commitment/c03-pf2-lease')
  await expect(page.locator('.cdetail')).toContainText('Reviewed: defer')

  // 6. Import: the Broadcom PO is half verified, its document beside the fields.
  await page.goto('./#/fairhaven/commitment/c18-broadcom-po')
  await expect(page.getByText('Source · PO-88213.pdf')).toBeVisible()

  // 7. Close on Coming up: the next 180 days.
  await page.goto('./#/fairhaven/watch/coming-up')
  await expect(page.locator('.coming-strip > svg')).toBeVisible()
  await expect(page.locator('.coming-item').first()).toContainText('Apr 3')
})
