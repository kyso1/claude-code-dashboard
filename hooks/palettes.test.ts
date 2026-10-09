import { expect, test } from 'claude-code/testing'

import { PALETTE_KEYS } from './look'
import { CLASSIC, PALETTES, classicRamp, paletteOf } from './palettes'
import { CLAUDE, fromHex, rgb } from './paint'

const chan = (c: number) => [c >> 16, (c >> 8) & 0xff, c & 0xff]
const near = (a: number, b: number) => chan(a).every((v, i) => Math.abs(v - (chan(b)[i] ?? 0)) <= 1)

test('one palette per key, in the menu order, P0 first', () => {
  expect(PALETTES.map(p => p.key)).toEqual([...PALETTE_KEYS])
})

test('a ramp runs from its first stop at 100% to its last at 0%', () => {
  const tokyo = PALETTES.find(p => p.key === 'tokyo')!
  expect(near(rgb(tokyo.ramp(100)), rgb(fromHex('#9ece6a')!))).toBe(true)
  expect(near(rgb(tokyo.ramp(0)), rgb(fromHex('#f7768e')!))).toBe(true)
  expect(CLASSIC.ramp).toBe(classicRamp)
})

test('no ramp jumps: neighbouring percents stay close on every palette', () => {
  for (const p of PALETTES) {
    let prev = chan(rgb(p.ramp(100)))
    for (let left = 99; left >= 0; left--) {
      const c = chan(rgb(p.ramp(left)))
      const jump = Math.max(...c.map((v, i) => Math.abs(v - (prev[i] ?? 0))))
      expect(`${p.key}@${left}: ${jump < 16}`).toBe(`${p.key}@${left}: true`)
      prev = c
    }
  }
})

test("'tema' wears the theme's color on the classic palette; the others keep theirs", () => {
  const green = fromHex('#50b838')!
  expect(paletteOf('tema', green).accent).toEqual(green)
  expect(paletteOf('tema', green).ramp).toBe(classicRamp)
  expect(paletteOf('dracula', green).accent).not.toEqual(green)
  expect(paletteOf('tema', CLAUDE).accent).toEqual(CLAUDE)
})
