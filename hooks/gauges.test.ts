import { expect, test } from 'claude-code/testing'

import { gaugeRow, PAUSE, RADIUS, ramp, SPEED } from './gauges'
import { PALETTES } from './palettes'
import { CAP_L, CAP_R, rgb, type Cell } from './paint'

const str = (cells: Cell[]) => cells.map(c => c.ch).join('')
const chan = (c: number) => [c >> 16, (c >> 8) & 0xff, c & 0xff]
const sum = (p: Cell['fg'] | undefined) => (p ? chan(rgb(p)).reduce((a, b) => a + b) : 0)

const NOW = new Date(2026, 9, 8, 18, 0).getTime() // Thursday
const SAME_DAY = new Date(2026, 9, 8, 23, 10).getTime()
const LATER = new Date(2026, 9, 14, 11, 0).getTime() // Wednesday
const GAUGES = [
  { label: 'ctx', left: 91 },
  { label: '5h', left: 50, resetsAt: SAME_DAY },
  { label: '7d', left: 63, resetsAt: LATER },
]
const restOf = (n: number) => ((n + 6 * RADIUS) / SPEED) * 1000 + PAUSE / 2 // glint off

test('rounded badge, rounded capsule bar with 1/8 precision, percentage and reset', () => {
  const pill = (s: string) => CAP_L + s + CAP_R + ' '
  const bar = (s: string) => CAP_L + s + CAP_R
  // 91% of 16 cells = 14.56: 14 full, then 4/8
  expect(str(gaugeRow(GAUGES, NOW, 0))).toBe(
    pill('CTX') + bar('█'.repeat(14) + '▌ ') + '  91%' +
      '   ' + pill('5H') + bar('█'.repeat(8) + ' '.repeat(8)) + '  50% ↻ 23:10' +
      '   ' + pill('7D') + bar('█'.repeat(10) + '▏' + ' '.repeat(5)) + '  63% ↻ qua 11:00',
  )
  expect(str(gaugeRow([{ label: '7d', left: null }], NOW, 0))).toBe(pill('7D') + bar('╌'.repeat(16)) + '   -- ↻ --')
})

test('a full bar closes on the fill color, a partial one on the track', () => {
  const full = gaugeRow([{ label: 'ctx', left: 100 }], NOW, restOf(40))
  const half = gaugeRow([{ label: 'ctx', left: 50 }], NOW, restOf(40))
  const capR = (cells: Cell[]) => cells.filter(c => c.ch === CAP_R)[1]!
  expect(sum(capR(full).fg)).toBeGreaterThan(sum(capR(half).fg))
})

test('bars shrink to fit a narrow band', () => {
  const wide = gaugeRow(GAUGES, NOW, 0).length
  expect(gaugeRow(GAUGES, NOW, 0, 90).length).toBeLessThanOrEqual(90)
  expect(gaugeRow(GAUGES, NOW, 0, 90).length).toBeLessThan(wide)
})

test('ramp runs green at 100% to red at 0%, with no jumps', () => {
  expect(chan(rgb(ramp(100)))).toEqual([117, 223, 143])
  expect(chan(rgb(ramp(0)))).toEqual([247, 92, 97])
  let prev = chan(rgb(ramp(100)))
  for (let p = 99; p >= 0; p--) {
    const c = chan(rgb(ramp(p)))
    expect(Math.max(...c.map((v, i) => Math.abs(v - (prev[i] ?? 0))))).toBeLessThan(12)
    prev = c
  }
})

test('glint lights the bar and its track where the sweep is, and rests in the pause', () => {
  const g = [{ label: 'ctx', left: 50 }]
  const at = (x: number) => gaugeRow(g, NOW, ((x + 3 * RADIUS) / SPEED) * 1000) // glint centred on column x
  // col 8: a fill cell; col 18: an empty track cell
  expect(sum(at(8)[8]?.fg)).toBeGreaterThan(sum(at(24)[8]?.fg))
  expect(sum(at(18)[18]?.bg)).toBeGreaterThan(sum(at(8)[18]?.bg))
  const rest = restOf(gaugeRow(g, NOW, 0).length)
  expect(sum(gaugeRow(g, NOW, rest)[18]?.bg)).toBe(sum(gaugeRow(g, NOW, rest + 100)[18]?.bg))
})

test('a gauge under 15% breathes; one above does not', () => {
  const badge = (left: number, dt: number) => sum(gaugeRow([{ label: '5h', left }], NOW, restOf(40) + dt)[1]?.bg)
  expect(badge(10, 0)).not.toBe(badge(10, 350))
  expect(badge(60, 0)).toBe(badge(60, 350))
})

test('a light palette draws light badges and tracks with the same glyphs', () => {
  const papel = PALETTES.find(p => p.key === 'papel')!
  const g = [{ label: 'ctx', left: 50 }]
  const light = gaugeRow(g, NOW, restOf(40), Infinity, papel)
  const dark = gaugeRow(g, NOW, restOf(40))
  expect(light[1]!.bg![0]).toBeGreaterThan(0.8) // the badge behind "CTX"
  expect(dark[1]!.bg![0]).toBeLessThan(0.4)
  expect(str(light)).toBe(str(dark))
})
