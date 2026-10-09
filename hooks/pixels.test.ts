import { expect, test } from 'claude-code/testing'

import { DEFAULT_LOOK } from './look'
import type { Paint } from './paint'
import { blankCanvas, dot, glyph, toCells } from './pixels'

const A: Paint = [0.7, 0.1, 40]
const B: Paint = [0.3, 0.05, 250]
const fresh = (rows: 3 | 4 = 3) => blankCanvas({ look: DEFAULT_LOOK, hat: null, t: 0 }, rows)
const cell = (cv: ReturnType<typeof fresh>, cx = 0, cy = 0) => toCells(cv)[cy]![cx]!

test('a full cell of two colors draws the fewer as the glyph over the other', () => {
  const cv = fresh()
  dot(cv, 0, 0, A), dot(cv, 1, 0, B), dot(cv, 0, 1, B), dot(cv, 1, 1, B)
  const c = cell(cv)
  expect([c.ch, c.fg, c.bg]).toEqual(['▘', A, B])
})

test('a tie keeps the first color in reading order as the glyph', () => {
  const cv = fresh()
  dot(cv, 0, 0, A), dot(cv, 1, 0, A), dot(cv, 0, 1, B), dot(cv, 1, 1, B)
  const c = cell(cv)
  expect([c.ch, c.fg, c.bg]).toEqual(['▀', A, B])
})

test('two colors and a hole cannot share a cell: the vote wins, no background', () => {
  const cv = fresh()
  dot(cv, 0, 0, A), dot(cv, 1, 0, A), dot(cv, 0, 1, B)
  const c = cell(cv)
  expect([c.ch, c.fg, c.bg]).toEqual(['▛', A, undefined])
})

test('on 4 rows the scene stands a cell lower and a hat fits above it', () => {
  const cv = fresh(4)
  dot(cv, 0, 0, A) // the head's top row
  dot(cv, 0, -2, B) // a hat's top row
  glyph(cv, 3, 0, '!', A)
  const g = toCells(cv)
  expect(g.length).toBe(4)
  expect(g[0]![0]!.ch).toBe('▘')
  expect(g[1]![0]!.ch).toBe('▘')
  expect(g[1]![3]!.ch).toBe('!')
  const flat = fresh(3)
  dot(flat, 0, -1, A) // off the stage without the hat row
  expect(cell(flat).ch).toBe(' ')
})
