import { expect, test } from '@playwright/test'
import { LOCAL_APP } from '../local.ts'
import { open } from './helpers.ts'

// A project of the user's own (tyapi docs/20-projects-and-branches.md, Phase 1): the mock visitor, an owner of the
// longreach org, makes one; it opens when its graph is ready, empty, as them; a commitment drafted while reading
// main starts an update of its own. Each run makes a new project, named for the time it ran.

test('a project made, opened empty, and a first change that starts an update', async ({ page }) => {
  test.setTimeout(180_000)
  await open(page, 'commitment')
  await page.goto(`${LOCAL_APP}/#/new-project`)
  const name = `iHealth ${Date.now()}`
  await page.getByRole('combobox').selectOption('longreach')
  await page.getByRole('textbox').fill(name)
  await page.getByRole('button', { name: 'Make the project' }).click()
  await expect(page).toHaveURL(/#\/p\/longreach\/ihealth-\d+\/draft$/)
  await expect(page.getByRole('textbox', { name: 'What are you committing to?' })).toBeVisible({ timeout: 150_000 })

  await expect(page.getByRole('tab', { name: /^Commit/ })).toContainText('0')
  await expect(page.getByRole('button', { name: /^Working in/ })).toContainText('Working in: main')

  await page.getByRole('textbox', { name: 'What are you committing to?' }).fill('We will move patient records to the new platform by Q3.')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('We will move patient records')
  await expect(page.getByRole('button', { name: /^Working in/ })).toContainText('Commitment: We will move patient records')
  await expect(page.getByRole('complementary', { name: 'What is not done' })).toContainText('Who is accountable for this?')

  // Back to main, from the same control: the draft is the update's, not main's yet.
  await page.getByRole('button', { name: /^Working in/ }).click()
  await page.getByRole('group', { name: 'Your updates' }).getByRole('button', { name: /^main/ }).click()
  await expect(page.getByRole('button', { name: /^Working in/ })).toContainText('Working in: main')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('No draft here')
})

test('an owner gives the org’s consent to model providers, and withdraws it', async ({ page }) => {
  await open(page, 'commitment')
  await page.goto(`${LOCAL_APP}/#/model-consent`)
  const org = page.getByRole('region', { name: "Longreach's consent" })
  await org.getByRole('checkbox', { name: /Anthropic/ }).check()
  await org.getByRole('button', { name: /^(Consent|Change consent)$/ }).click()
  await expect(org).toContainText('Consented to anthropic by')
  await org.getByRole('button', { name: 'Withdraw' }).click()
  await expect(org).toContainText('No consent')
})
