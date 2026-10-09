import { expect, test } from 'claude-code/testing'

import { MIN_RIGHT, composeBand, type BandState } from './band'
import { STAGE_W } from './clawd'
import { DEFAULT_LOOK } from './look'
import { CLAUDE, type Cell } from './paint'

const T0 = 1_000_000
const base: BandState = {
  mood: { working: false, since: T0 }, gauges: [{ label: 'ctx', left: 72 }],
  ident: { model: 'Opus 5.5', effort: 'high', modes: [] }, themeAccent: CLAUDE, look: DEFAULT_LOOK,
}
const row = (g: Cell[][], i: number) => g[i]!.map(c => c.ch).join('')
const hat = { ...base, look: { ...DEFAULT_LOOK, hat: 'coroa' as const } }

test('three rows as before; with a hat four, the text beside the last three', () => {
  const three = composeBand(base, T0 + 1000, 120)
  expect(three.length).toBe(3)
  expect(row(three, 0)).toContain('Opus 5.5')
  const four = composeBand(hat, T0 + 1000, 120)
  expect(four.length).toBe(4)
  expect(row(four, 0)).toContain('▐▄▀▄▌')
  expect(row(four, 0).length).toBe(STAGE_W + 2)
  expect(row(four, 1)).toContain('Opus 5.5')
  expect(row(four, 3)).toContain('CTX')
})

test('narrow: the stage drops and the text keeps three rows, hat or not', () => {
  const g = composeBand(hat, T0 + 1000, STAGE_W + 2 + MIN_RIGHT - 1)
  expect(g.length).toBe(3)
  expect(row(g, 0)).toContain('Opus 5.5')
})

test('the palette reaches the pips and the gauges, with the same glyphs', () => {
  const tokyo = composeBand({ ...base, look: { ...DEFAULT_LOOK, palette: 'tokyo' } }, T0 + 1000, 120)
  const classic = composeBand(base, T0 + 1000, 120)
  expect(tokyo.map((_, i) => row(tokyo, i))).toEqual(classic.map((_, i) => row(classic, i)))
  const pip = (g: Cell[][]) => g[0]!.find(c => c.ch === '▰')!.fg
  expect(pip(tokyo)).not.toEqual(pip(classic))
})
