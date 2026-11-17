import { expect, type Page, test } from '@playwright/test'
import { asKey, asVisitor, keyFor, open, reseed } from './helpers.ts'

// Updates (tyapi docs/20-projects-and-branches.md, Phase 2): the mock visitor starts an update, drafts in it, sees
// its changes with pending marks, puts one back, finds the sandbox untouched, and discards the update.

test.beforeEach(reseed)

const control = (page: Page) => page.getByRole('button', { name: /^Working in/ })

async function menu(page: Page) {
  await control(page).click()
  return page.getByRole('group', { name: 'Your updates' })
}

test('an update keeps its changes apart, lists them, puts one back, and is discarded', async ({ page }) => {
  await open(page, 'draft')
  await expect(control(page)).toContainText('Working in: Sandbox')
  await (await menu(page)).getByRole('textbox', { name: 'Name a new update' }).fill('Patient records')
  await page.keyboard.press('Enter')
  await expect(control(page)).toContainText('Working in: Patient records')
  await page.reload()
  await expect(control(page)).toContainText('Working in: Patient records')

  await page.getByRole('textbox', { name: 'What are you committing to?' }).fill('We will move patient records to the new platform by Q3.')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('We will move patient records')
  await page.getByRole('region', { name: 'The commitment' }).focus()
  await page.keyboard.press('/')
  await page.getByRole('dialog').getByRole('textbox').fill('assumption')
  await page.keyboard.press('Enter')
  const card = page.locator('.record-card.is-unsaved').last()
  await card.getByRole('textbox').first().fill('The vendor certifies HIPAA by May')
  await card.getByRole('textbox').first().press('Enter')
  const belief = page.locator('.record-card', { hasText: 'The vendor certifies HIPAA by May' }).first()
  await expect(belief.locator('.update-dot')).toBeVisible()

  await (await menu(page)).getByRole('link', { name: 'See what this update changes' }).click()
  const view = page.getByRole('region', { name: "The update's changes" })
  await expect(view.getByRole('heading', { level: 1 })).toHaveText('Patient records')
  await expect(view).toContainText('We will move patient records to the new platform by Q3')
  const row = view.locator('.update-row', { hasText: 'The vendor certifies HIPAA by May' })
  await expect(row).toContainText('Added')
  await expect(row).toContainText('by you')
  await row.getByRole('button', { name: 'Put back' }).click()
  await expect(view).not.toContainText('The vendor certifies HIPAA by May')

  await (await menu(page)).getByRole('button', { name: /Sandbox/ }).click()
  await expect(control(page)).toContainText('Working in: Sandbox')
  await expect(view).toContainText('No changes yet')

  await (await menu(page)).getByRole('button', { name: /Patient records/ }).click()
  await expect(view).toContainText('We will move patient records')
  page.once('dialog', (d) => void d.accept())
  await (await menu(page)).getByRole('button', { name: 'Discard “Patient records”' }).click()
  await expect(control(page)).toContainText('Working in: Sandbox')
  await expect(page.getByRole('group', { name: 'Your updates' })).toBeHidden()
  await control(page).click()
  await expect(page.getByRole('group', { name: 'Your updates' })).not.toContainText('Patient records')
})

test('the readiness list says what blocks a merge, and clears as it is fixed', async ({ page }) => {
  await open(page, 'draft')
  await (await menu(page)).getByRole('textbox', { name: 'Name a new update' }).fill('Ohio data center')
  await page.keyboard.press('Enter')
  await expect(control(page)).toContainText('Working in: Ohio data center')
  await page.getByRole('textbox', { name: 'What are you committing to?' }).fill('Open a second data center in Ohio.')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Open a second data center in Ohio')

  await (await menu(page)).getByRole('link', { name: 'See what this update changes' }).click()
  const panel = page.getByRole('region', { name: 'Merge into main' })
  await expect(panel).toContainText('Every live commitment has an owner (1 to fix)')
  await expect(panel).toContainText('Merging into main needs maintain')
  await expect(panel).toContainText('No conflicts with main')
  await expect(panel.getByRole('button', { name: 'Merge' })).toBeDisabled()

  await panel.getByRole('link', { name: 'Open the draft' }).click()
  await page.getByRole('region', { name: 'The commitment' }).focus()
  await page.keyboard.press('/')
  await page.getByRole('dialog').getByRole('textbox').fill('who owns')
  await page.keyboard.press('Enter')
  const card = page.locator('.record-card.is-unsaved').last()
  await card.getByRole('textbox').first().fill('Priya Natarajan')
  await card.getByRole('textbox').first().press('Enter')
  await expect(page.getByRole('region', { name: 'The commitment' })).toContainText('Priya Natarajan')

  await (await menu(page)).getByRole('link', { name: 'See what this update changes' }).click()
  await expect(panel).not.toContainText('Every live commitment has an owner')
  await expect(panel).toContainText('Merging into main needs maintain')
})

test('a conflict is resolved by taking main’s version with my own change laid over it', async ({ page, playwright }) => {
  await open(page, 'draft')
  await (await menu(page)).getByRole('textbox', { name: 'Name a new update' }).fill('Pricing')
  await page.keyboard.press('Enter')
  await expect(control(page)).toContainText('Working in: Pricing')
  const { updates } = (await asVisitor(page, 'GET', '/branches')) as { updates: { branch: string; name: string }[] }
  const mine = updates.find((u) => u.name === 'Pricing')!.branch
  await asVisitor(page, 'PUT', `/entities/Belief/gpuPrice?branch=${mine}`, { fields: { statement: 'My statement' } })

  // Meanwhile a maintainer changes another field of the same record, and merges it.
  const boss = await playwright.request.newContext({ ignoreHTTPSErrors: true })
  const key = keyFor('maintainer@longreach.ai')
  const theirs = ((await asKey(boss, key, 'POST', '/branches', { name: 'Theirs' })) as { branch: string }).branch
  await asKey(boss, key, 'PUT', `/entities/Belief/gpuPrice?branch=${theirs}`, { fields: { falsifier: 'Their falsifier' } })
  await asKey(boss, key, 'POST', `/branches/${theirs}/merge`)

  await (await menu(page)).getByRole('link', { name: 'See what this update changes' }).click()
  const panel = page.getByRole('region', { name: 'Merge into main' })
  await expect(panel).toContainText('1 conflict with main')
  await expect(panel.getByRole('textbox', { name: 'statement, resolved' })).toHaveValue('My statement')
  await expect(panel.getByRole('textbox', { name: 'falsifier, resolved' })).toHaveValue('Their falsifier')
  await panel.getByRole('button', { name: 'Resolve conflicts' }).click()
  await expect(panel).toContainText('No conflicts with main')
  await expect(panel).not.toContainText('1 conflict with main')
})
