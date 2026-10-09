import { expect, test } from 'claude-code/testing'

import { VERBS, stage, type Mood, type Scene } from './clawd'
import { rgb, type Cell } from './paint'

// A golden snapshot of the default band: every cell's glyph and colors, hashed,
// for each scene and phase at fixed instants. toCells() counts a cell's colors
// by object identity, so a change that looks like a no-op (say, moving the
// bench's inline dark-wood literal into a constant) can redraw the default
// band; this pins it to the band as it was before /boneco.
const T0 = 1_000_000
const AT = [600, 1300, 2750] // the last one inside a blink

// FNV-1a, 32 bits
function fnv(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
  return h
}
const hashOf = (g: Cell[][]) => fnv(g.map(r => r.map(c => `${c.ch}${rgb(c.fg)},${c.bg ? rgb(c.bg) : -1};`).join('')).join('\n'))

const MOODS: [string, Mood][] = [
  ...(Object.keys(VERBS) as Scene[]).map((s): [string, Mood] => [s, { working: true, since: T0, word: VERBS[s].split(' ')[0], mode: 'thinking' }]),
  ['idle', { working: false, since: T0 }],
  ['done', { working: false, since: T0, doneAt: T0 + 500, durationMs: 12_000 }],
  ['sleep', { working: false, since: T0 - 200_000 }],
]

const SNAP: Record<string, number[]> = {
  cook: [1627672346, 1806590124, 3510235524],
  think: [1880215073, 1498805112, 2197902019],
  build: [801103374, 801103374, 4063308949],
  dance: [2765926467, 1060416819, 3292862946],
  walk: [1518645033, 2730786581, 2174261140],
  magic: [857859121, 4186253795, 3915478167],
  grow: [3671805150, 215001139, 1200047942],
  wind: [662248238, 136391097, 4195999245],
  idle: [1868403758, 1868403758, 3530628823],
  done: [2633113745, 1659721772, 1416576367],
  sleep: [155556553, 1803652125, 1803652125],
}

test('the default band is drawn exactly as before /boneco, cell by cell', () => {
  const got = Object.fromEntries(MOODS.map(([name, m]) => [name, AT.map(dt => hashOf(stage(m, T0 + dt)))]))
  expect(JSON.stringify(got)).toBe(JSON.stringify(SNAP))
})
