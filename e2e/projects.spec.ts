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
})
