import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { expect, it } from 'vitest'

// Colors live only in ui/tokens.css (docs/PLAN.md §6.6). Any other stylesheet
// that writes a hex, rgb() or hsl() value fails here.

const SRC = resolve(import.meta.dirname, '..')
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/

function* stylesheets(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* stylesheets(path)
    else if (entry.name.endsWith('.css')) yield path
  }
}

it('no stylesheet outside tokens.css writes a raw color', () => {
  const offenders: string[] = []
  for (const file of stylesheets(SRC)) {
    if (file.endsWith('ui/tokens.css')) continue
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (RAW_COLOR.test(line)) offenders.push(`${relative(SRC, file)}:${i + 1}: ${line.trim()}`)
      })
  }
  expect(offenders).toEqual([])
})
