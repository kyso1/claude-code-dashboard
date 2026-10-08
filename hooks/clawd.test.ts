import { expect, test } from 'claude-code/testing'

import { DONE_MS, HOLD_MS, LABELS, STAGE_W, VERBS, caption, direct, phaseOf, sceneFor, sceneOf, stage, type Mood, type Scene } from './clawd'
import { safe, type Cell } from './paint'

const str = (rows: Cell[][]) => rows.map(r => r.map(c => c.ch).join('')).join('\n')
const T0 = 1_000_000
const working = (word: string, mode: Mood['mode'] = 'thinking'): Mood => ({ working: true, word, mode, since: T0 })

test('every one of the 189 spinner verbs has exactly one scene', () => {
  const all = (Object.values(VERBS) as string[]).flatMap(v => v.split(' '))
  expect(all.length).toBe(189)
  expect(new Set(all).size).toBe(189)
  expect(sceneOf('Sautéing')).toBe('cook')
  expect(sceneOf('Pondering…')).toBe('think')
  expect(sceneOf('Moonwalking')).toBe('dance')
  expect(sceneOf("Beboppin'")).toBe('dance')
})

test('a verb it does not know falls back on the spinner mode', () => {
  expect(sceneOf('Frobnicating', 'tool-use')).toBe('build')
  expect(sceneOf('Frobnicating', 'responding')).toBe('dance')
  expect(sceneOf(undefined, 'thinking')).toBe('think')
})

test('each scene draws 3 rows of width-1 cells and moves over time', () => {
  for (const scene of Object.keys(VERBS) as Scene[]) {
    const word = VERBS[scene].split(' ')[0]!
    const a = stage(working(word), T0)
    expect(a.length).toBe(3)
    for (const row of a) {
      expect(row.length).toBe(STAGE_W)
      for (const c of row) expect(safe(c.ch)).toBe(c.ch)
    }
    const frames = new Set([0, 150, 300, 450, 600, 900].map(dt => str(stage(working(word), T0 + dt))))
    expect(`${scene}: ${frames.size > 1 ? 'animated' : 'still'}`).toBe(`${scene}: animated`)
  }
})

test('the mascot is the welcome-screen sprite, and blinks', () => {
  const idle: Mood = { working: false, since: T0 }
  const open = str(stage(idle, T0 + 1000))
  expect(open.split('\n')[0]).toContain('▐▛███▜▌')
  expect(open.split('\n')[1]).toContain('▝▜█████▛▘')
  const shut = str(stage(idle, T0 - (T0 % 3700) + 3700 + 50)) // inside the 130 ms blink
  expect(shut.split('\n')[0]).toContain('▐████')
})

test('idle, then asleep after 90s; a finished turn celebrates first', () => {
  const idle: Mood = { working: false, since: T0 }
  expect(phaseOf(idle, T0 + 1000)).toBe('idle')
  expect(phaseOf(idle, T0 + 91_000)).toBe('sleep')
  const done: Mood = { working: false, since: T0, doneAt: T0, durationMs: 12_000 }
  expect(phaseOf(done, T0 + 100)).toBe('done')
  expect(phaseOf(done, T0 + DONE_MS + 1)).toBe('idle')
  expect(str([caption(done, undefined, T0 + 100, 60)])).toContain('✓ feito em 12s')
})

test('the caption says the verb, the scene and the tool in use, in one row', () => {
  const row = (m: Mood, tool?: Parameters<typeof caption>[1], width = 100) => str([caption(m, tool, T0, width)])
  expect(row(working('Sautéing'))).toContain(`Sautéing…  ${LABELS.cook}   pensando`)
  expect(row(working('Sautéing'), { id: 'x', name: 'Bash', detail: 'npm test' })).toContain(`${LABELS.cook}   › Bash npm test`)
  expect(row({ ...working('Thinking'), message: 'Compacting conversation' })).toContain('Compacting conversation…')
  expect(row(working('Sautéing'), { id: 'x', name: 'Bash', detail: 'x'.repeat(200) }, 40).length).toBe(40)
})

// --- regressions: half-cell offsets, one scene a turn, a name -----------------

// the face as the welcome screen draws it, with any eye (front, up, shut) and
// any arm; a sprite one pixel off the cell grid never matches
const FACE = /[▐▟▝][▛▙█]███[▜▟█][▌▙▘]/

test('the mascot never lands between cells, in any scene or phase', () => {
  const moods: [string, Mood][] = (Object.keys(VERBS) as Scene[]).map(s => [s, working(VERBS[s].split(' ')[0]!)])
  moods.push(['idle', { working: false, since: T0 }], ['done', { working: false, since: T0, doneAt: T0 + 3000 }], ['sleep', { working: false, since: T0 - 200_000 }])
  for (const [name, m] of moods) {
    for (let dt = 0; dt < 6000; dt += 37) {
      const [top = '', body = ''] = str(stage(m, T0 + dt)).split('\n')
      expect(`${name}@${dt}: ${FACE.test(top) ? 'face' : top}`).toBe(`${name}@${dt}: face`)
      expect(`${name}@${dt}: ${body.includes('██████') ? body : 'body'}`).toBe(`${name}@${dt}: body`)
    }
  }
})

test('the tool in use picks the scene, so a long turn keeps changing', () => {
  const m = working('Shenaniganing', 'tool-use')
  const at = (name: string) => sceneFor(m, { id: 'x', name, detail: '' })
  expect(sceneFor(m, undefined)).toBe('walk') // the verb, between tools
  expect(at('Bash')).toBe('cook')
  expect(at('Read')).toBe('think')
  expect(at('Grep')).toBe('walk')
  expect(at('Edit')).toBe('build')
  expect(at('Agent')).toBe('magic')
  expect(at('mcp__context7__query-docs')).toBe('wind')
})

test('a scene holds a moment before the next, so quick tools do not flicker', () => {
  const d = { scene: undefined as Scene | undefined, since: 0 }
  expect(direct(d, 'cook', 1000)).toBe('cook')
  expect(direct(d, 'build', 1500)).toBe('cook')
  expect(direct(d, 'build', 1000 + HOLD_MS)).toBe('build')
})

test('the caption speaks of the mascot by its name, once it has one', () => {
  expect(str([caption(working('Sautéing'), undefined, T0, 100, undefined, 'cook', 'Kiko')])).toContain('Kiko está cozinhando')
  expect(str([caption({ working: false, since: T0 }, undefined, T0 + 10, 100, undefined, undefined, 'Kiko')])).toContain('Kiko está pronto')
  expect(str([caption({ working: false, since: T0, doneAt: T0, durationMs: 3000 }, undefined, T0 + 10, 100, undefined, undefined, 'Kiko')])).toContain('Kiko terminou em 3s')
})

test('the mode is not said twice when the scene already says it', () => {
  const row = str([caption(working('Pondering', 'thinking'), undefined, T0, 100, undefined, 'think', 'Kiko')])
  expect(row).toContain('Kiko está pensando')
  expect(row.split('pensando').length - 1).toBe(1)
  expect(str([caption(working('Sautéing', 'thinking'), undefined, T0, 100, undefined, 'cook')])).toContain('cozinhando   pensando')
})
