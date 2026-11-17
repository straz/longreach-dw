import { expect, type Page, test } from '@playwright/test'
import { open, reseed } from './helpers.ts'

// The drafting page, phase A (tyapi docs/21-new-commitment.md, §7): a commitment written from the keyboard with an
// owner, two assumptions, evidence for one, a stop rule and a risk, in the mock visitor's sandbox of Fairhaven; and
// an unsaved card that a reload keeps.

test.beforeEach(reseed)

/** Open the palette on the commitment, or on a card, and choose what to add by typing part of its words. */
async function add(page: Page, what: string, on?: string) {
  if (on) await page.locator('.record-card', { hasText: on }).first().focus()
  else await page.getByRole('region', { name: 'The commitment' }).focus()
  await page.keyboard.press('/')
  const palette = page.getByRole('dialog')
  await expect(palette).toBeVisible()
  await palette.getByRole('textbox').fill(what)
  await page.keyboard.press('Enter')
  await expect(palette).toBeHidden()
}

/** Type a new card's text and save it with Enter. */
async function write(page: Page, text: string) {
  const card = page.locator('.record-card.is-unsaved').last()
  await card.getByRole('textbox').first().fill(text)
  await card.getByRole('textbox').first().press('Enter')
  await expect(page.locator('.record-card.is-unsaved')).toHaveCount(0)
  await expect(page.getByRole('article')).toContainText(text)
}

test('a commitment drafted from the keyboard, its gaps asked for as it grows', async ({ page }) => {
  await open(page, 'draft')
  await page.getByRole('textbox', { name: 'What are you committing to?' }).fill('We will move patient records to the new platform by Q3.')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('We will move patient records to the new platform by Q3')
  const coach = page.getByRole('complementary', { name: 'What is not done' })
  await expect(coach).toContainText('Who is accountable for this?')

  await add(page, 'who owns')
  await write(page, 'Priya Natarajan')
  await expect(page.getByRole('region', { name: 'The commitment' })).toContainText('Priya Natarajan')
  await expect(coach).toContainText('Nothing blocks this draft.')

  await add(page, 'assumption')
  await write(page, 'The vendor certifies HIPAA by May')
  await add(page, 'assumption')
  await write(page, 'Clinics accept a weekend cutover')
  await expect(page.getByRole('region', { name: 'Rests on' })).toContainText('Rests on · 2')
  await expect(coach).toContainText('What would tell you “The vendor certifies HIPAA by May” is wrong?')

  await add(page, 'evidence for', 'The vendor certifies HIPAA by May')
  await write(page, 'The vendor’s roadmap shows the audit in April')
  const vendor = page.locator('.record-card', { hasText: 'The vendor certifies HIPAA by May' }).first()
  await expect(vendor).toContainText('supported by')

  await add(page, 'stop rule')
  await write(page, 'The vendor misses the May audit')
  await add(page, 'a risk…')
  const risk = page.locator('.record-card.is-unsaved').last()
  await risk.getByRole('textbox').first().fill('Records are lost in the move')
  await risk.getByRole('spinbutton').fill('3')
  await risk.getByRole('spinbutton').press('Enter')
  await expect(page.getByRole('region', { name: 'What could change' })).toContainText('Records are lost in the move')
  await expect(page.getByRole('region', { name: 'What could change' })).toContainText('Stop rule')

  // Undo takes back the last change, the risk.
  await page.getByRole('button', { name: /^Undo/ }).first().click()
  await expect(page.getByRole('region', { name: 'What could change' })).not.toContainText('Records are lost in the move')
})

test('a reload keeps a card not yet saved', async ({ page }) => {
  await open(page, 'draft')
  await page.getByRole('textbox', { name: 'What are you committing to?' }).fill('Open a second data center in Ohio.')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Open a second data center in Ohio')
  await add(page, 'goal')
  await page.locator('.record-card.is-unsaved').getByRole('textbox').fill('Halve latency for Midwest clients')
  await page.reload()
  await expect(page.locator('.record-card.is-unsaved').getByRole('textbox')).toHaveValue('Halve latency for Midwest clients')
  await expect(page.getByRole('complementary', { name: 'What is not done' })).toContainText('Unsaved')
})
