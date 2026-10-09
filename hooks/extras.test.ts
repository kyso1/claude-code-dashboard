import { expect, test } from 'claude-code/testing'

import { SUSTO_MS, react, stage, type Mood, type Reaction } from './clawd'
import { DEFAULT_LOOK, type Extra, type Look } from './look'
import { CLAUDE, type Cell } from './paint'

const T0 = 1_000_000
const idle: Mood = { working: false, since: T0 }
const cooking: Mood = { working: true, since: T0, word: 'Sautéing', mode: 'tool-use' }
const wearing = (...extras: Extra[]): Look => ({ ...DEFAULT_LOOK, extras })
const str = (g: Cell[][]) => g.map(r => r.map(c => c.ch).join('')).join('\n')
const frame = (m: Mood, t: number, lk: Look, reaction?: Reaction, ctxLeft?: number) =>
  str(stage(m, t, CLAUDE, m.working ? 'cook' : undefined, { look: lk, reaction, ctxLeft }))

test('a failed tool startles it for a moment, over the scene; then the scene is back', () => {
  const r: Reaction = { sustoAt: T0 + 100 }
  expect(frame(cooking, T0 + 200, wearing('susto'), r)).toContain('!')
  const after = T0 + 100 + SUSTO_MS + 10
  expect(frame(cooking, after, wearing('susto'), r)).toBe(frame(cooking, after, wearing()))
  expect(frame(cooking, T0 + 200, wearing(), r)).toBe(frame(cooking, T0 + 200, wearing())) // off unless picked
})

test('waiting on a permission it waves and asks; a startle wins over the wave', () => {
  const waving = [0, 250, 500, 750].map(dt => frame(idle, T0 + dt, wearing('aceno'), { waiting: true }))
  expect(waving.some(f => f.includes('?'))).toBe(true)
  expect(new Set(waving).size).toBeGreaterThan(1)
  const both = frame(idle, T0 + 150, wearing('aceno', 'susto'), { waiting: true, sustoAt: T0 + 100 })
  expect(both).toContain('!')
  expect(both).not.toContain('?')
})

test('reactions follow the main thread only, and end as the spec says', () => {
  expect(react({}, { kind: 'failure', agentId: 'sub-1' }, T0)).toEqual({})
  expect(react({}, { kind: 'failure' }, T0)).toEqual({ waiting: false, sustoAt: T0 })
  expect(react({ sustoAt: 5 }, { kind: 'failure', interrupt: true }, T0)).toEqual({ waiting: false, sustoAt: 5 }) // Esc is no failure
  expect(react({}, { kind: 'permission' }, T0)).toEqual({ waiting: true })
  expect(react({ waiting: true, sustoAt: 5 }, { kind: 'settled' }, T0)).toEqual({ waiting: false, sustoAt: 5 })
  expect(react({ waiting: true, sustoAt: 5 }, { kind: 'reset' }, T0)).toEqual({})
})

test('low on context it pales and sweats, the drop beside its head; unknown context, no sweat', () => {
  const lk = wearing('suor')
  const frames = [0, 300, 600].map(dt => stage(idle, T0 + dt, CLAUDE, undefined, { look: lk, ctxLeft: 9 }))
  expect(frames.some(g => g[0]![9]!.ch !== ' ')).toBe(true) // cell 9: x 18-19, beside the head
  expect(frames[0]![1]![4]!.fg).not.toEqual(CLAUDE) // a body cell, paler
  expect(str(stage(idle, T0, CLAUDE, undefined, { look: lk, ctxLeft: 40 }))).toBe(str(stage(idle, T0)))
  expect(str(stage(idle, T0, CLAUDE, undefined, { look: lk, ctxLeft: undefined }))).toBe(str(stage(idle, T0)))
})

test('idle, it fidgets: looks around, yawns and stretches, taps a foot', () => {
  const plain = new Set<string>()
  const fidget = new Set<string>()
  for (let dt = 0; dt < 9000; dt += 100) {
    plain.add(frame(idle, T0 + dt, wearing()))
    fidget.add(frame(idle, T0 + dt, wearing('ocio')))
  }
  expect(fidget.size).toBeGreaterThan(plain.size)
  expect([...fidget].some(f => f.includes('o'))).toBe(true)
})

test('the pet sits beside it and trails it on a walk', () => {
  const sitting = stage(idle, T0, CLAUDE, undefined, { look: wearing('pet') })
  expect(sitting[2]!.map(c => c.ch).join('')).toContain('▙▟')
  const walking: Mood = { working: true, since: T0, word: 'Meandering', mode: 'tool-use' }
  const trail = stage(walking, T0, CLAUDE, 'walk', { look: wearing('pet') })
  expect(trail[2]!.map(c => c.ch).join('')).toContain('▙▟')
})
