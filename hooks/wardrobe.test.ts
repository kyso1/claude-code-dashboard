import { expect, test } from 'claude-code/testing'

import { STAGE_W, VERBS, drawStage, stage, type Mood, type Scene } from './clawd'
import { DEFAULT_LOOK, EYE_MODES, HATS, HAT_KEYS, SHAPES, type HatKey, type Look } from './look'
import { PALETTES, paletteOf } from './palettes'
import { CLAUDE, fromHex, type Cell } from './paint'
import { quad } from './pixels'
import { bodyColor, hatFor } from './wardrobe'

const T0 = 1_000_000
const AT = T0 + 1000 // idle, eyes open to the front, no blink, no glint
const idle: Mood = { working: false, since: T0 }
const rows = (g: Cell[][]) => g.map(r => r.map(c => c.ch).join(''))
const look = (o: Partial<Look>): Look => ({ ...DEFAULT_LOOK, ...o })
const at = (o: Partial<Look>) => rows(stage(idle, AT, CLAUDE, undefined, { look: look(o) }))

test('the default look draws the band as before /boneco', () => {
  for (const dt of [0, 500, 1300, 4000])
    expect(rows(stage(idle, T0 + dt, CLAUDE, undefined, { look: DEFAULT_LOOK, palette: paletteOf('tema', CLAUDE) }))).toEqual(rows(stage(idle, T0 + dt)))
})

test('each eye mode draws its own face row', () => {
  const FACES: Record<Look['eyes'], string> = { vazados: '▐▛███▜▌', grandes: '▐▌███▐▌', led: '▐▗███▖▌', oculos: '▐▀███▀▌', visor: '▐▀▀▀▀▀▌' }
  for (const eyes of EYE_MODES) expect(`${eyes}: ${at({ eyes })[0]!.includes(FACES[eyes])}`).toBe(`${eyes}: true`)
  const led = stage(idle, AT, CLAUDE, undefined, { look: look({ eyes: 'led', led: '#ff0000' }) })[0]![3]!
  expect(led.ch).toBe('▗')
  expect(led.fg).toEqual(fromHex('#ff0000')!)
  expect(led.bg).toEqual(CLAUDE)
})

test('the silhouettes carve the body without moving it', () => {
  expect(at({ shape: 'orelhas' })[0]).toContain('▐▛▄▄▄▜▌')
  expect(at({ shape: 'redondo' })[0]).toContain('▗▛███▜▖')
  expect(at({ shape: 'redondo' })[1]).toContain('▝▀█████▀▘')
  expect(at({ shape: 'fantasma' })[2]).toContain('▘▘▘▘▘▘')
  expect(at({ cheeks: true })[1]).toContain('▝▜▘███▝▛▘')
})

test('a hat adds a row above the head, and the face stays whole under it', () => {
  const HAT_ROWS: Record<HatKey, string> = {
    cartola: '▄▀▀▀▄', chef: '▝▀▀▀▘', coroa: '▐▄▀▄▌', bone: '▟███▙▄▖', festa: '▗▀▖', aureola: '▀▀▀', antenas: '▚   ▞',
    chifres: '▝▖   ▗▘', gato: '▙   ▟', bruxo: '▗▄▄▟█▄▖', obra: '▗▟███▙▖', noel: '▄▀▀▀█', palha: '▄▄▀▀▀▄▄', laco: '▐▄▌',
  }
  for (const hat of HAT_KEYS) {
    const g = at({ hat })
    expect(`${hat}: ${g.length} ${g[0]!.includes(HAT_ROWS[hat])} ${g[1]!.includes('▐▛███▜▌')}`).toBe(`${hat}: 4 true true`)
  }
  expect(at({ hat: 'cena' }).length).toBe(4) // keeps its height between scenes
})

test('the automatic hats: by scene, by month, none between scenes', () => {
  expect(hatFor('cena', 'cook', 0)).toBe('chef')
  expect(hatFor('cena', undefined, 0)).toBeNull()
  expect(hatFor('sazonal', undefined, 9)).toBe('bruxo')
  expect(hatFor('sazonal', undefined, 11)).toBe('noel')
  expect(hatFor('sazonal', undefined, 3)).toBeNull()
  expect(hatFor('none', 'cook', 9)).toBeNull()
  expect(hatFor('coroa', undefined, 3)).toBe('coroa')
})

test('body colors: palette, fixed, rainbow, model, scene, context, effort', () => {
  const tokyo = PALETTES.find(p => p.key === 'tokyo')!
  const c = (o: Partial<Look>, scene?: Scene, ctx = {}) => bodyColor(look(o), CLAUDE, tokyo, AT, scene, ctx)
  expect(c({})).toEqual(CLAUDE)
  expect(c({ color: 'fixa', fixed: '#ff0000' })).toEqual(fromHex('#ff0000')!)
  expect(bodyColor(look({ color: 'arco' }), CLAUDE, tokyo, 0, undefined)[2]).not.toBe(bodyColor(look({ color: 'arco' }), CLAUDE, tokyo, 5000, undefined)[2])
  expect(c({ color: 'modelo' }, undefined, { model: 'Sonnet 5.5' })[2]).toBe(250)
  expect(c({ color: 'modelo' }, undefined, { model: 'GPT 9' })).toEqual(CLAUDE)
  expect(c({ color: 'cena' }, 'magic')[2]).toBe(305)
  expect(c({ color: 'cena' })).toEqual(CLAUDE)
  expect(c({ color: 'contexto' }, undefined, { ctxLeft: 80 })).toEqual(CLAUDE)
  expect(c({ color: 'contexto' })).toEqual(CLAUDE) // context unknown: as if full
  expect(c({ color: 'contexto' }, undefined, { ctxLeft: 30 })[1]).toBeLessThan(CLAUDE[1])
  expect(Math.abs(c({ color: 'contexto' }, undefined, { ctxLeft: 5 })[2] - 25)).toBeLessThan(0.5)
  expect(c({ color: 'effort' }, undefined, { effortLevel: 'max' })).toEqual(tokyo.ramp(0))
  expect(c({ color: 'effort' }, undefined, { effortLevel: 'ultra' })).toEqual(CLAUDE) // an effort it does not know
})

test('no outfit puts two colors and a hole (or three colors) in a cell of the mascot', () => {
  const scenes: [string, Mood, Scene | undefined][] = [
    ...(Object.keys(VERBS) as Scene[]).map((s): [string, Mood, Scene] => [s, { working: true, since: T0, word: VERBS[s].split(' ')[0]!, mode: 'thinking' }, s]),
    ['idle', idle, undefined],
    ['done', { working: false, since: T0, doneAt: T0 + 3000 }, undefined],
    ['sleep', { working: false, since: T0 - 200_000 }, undefined],
  ]
  const bad: string[] = []
  for (const eyes of EYE_MODES) for (const shape of SHAPES) for (const hat of HATS) for (const duo of [false, true]) {
    const lk = look({ eyes, shape, hat, duo, cheeks: duo, led: '#00ffcc' })
    for (const [name, m, scene] of scenes) for (const dt of [0, 130, 260, 520, 1300, 2600]) {
      const cv = drawStage(m, T0 + dt, CLAUDE, scene, { look: lk, month: 9 })
      // the mascot's columns, head (and hat) to waist: cells cell+1 .. cell+7
      for (let cy = 0; cy < cv.rows - 1; cy++) for (let cx = cv.cell + 1; cx <= cv.cell + 7; cx++) {
        if (cv.glyphs.has(cy * STAGE_W + cx)) continue
        const q = quad(cv, cx, cy)
        const colors = new Set(q.filter(Boolean)).size
        if (colors > 2 || (colors === 2 && q.includes(null))) bad.push(`${eyes}/${shape}/${hat}/${duo ? 'duo' : '-'} ${name}@${dt} ${cx},${cy}`)
      }
    }
  }
  expect(bad.slice(0, 5)).toEqual([])
})
