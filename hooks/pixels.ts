// The stage's pixel grid: quadrant pixels, 2x2 a cell, on 3 rows of cells; on
// 4 when the mascot wears a hat, the scene then standing one whole cell lower
// (y -2 and -1 are the hat's). A cell takes one glyph, a foreground color and
// a background color.

import type { HatKey, Look } from './look'
import { TEXT, type Cell, type Paint } from './paint'

export const STAGE_W = 22 // cells
const PW = STAGE_W * 2 // pixels
const QUAD = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█' // index = UL 1 | UR 2 | LL 4 | LR 8

// what the mascot wears in this frame, read by clawd() wherever a scene draws it
export type Dress = { look: Look; hat: HatKey | null; t: number }
export type Canvas = { rows: 3 | 4; oy: 0 | 2; px: (Paint | null)[]; glyphs: Map<number, Cell>; dress: Dress; cell: number }

export function blankCanvas(dress: Dress, rows: 3 | 4 = 3): Canvas {
  return { rows, oy: rows === 4 ? 2 : 0, px: new Array<Paint | null>(PW * rows * 2).fill(null), glyphs: new Map(), dress, cell: 1 }
}

// x, y in scene pixels: y 0 is the head's top row
export function dot(cv: Canvas, x: number, y: number, p: Paint | null) {
  x = Math.round(x)
  y = Math.round(y) + cv.oy
  if (x >= 0 && x < PW && y >= 0 && y < cv.rows * 2) cv.px[y * PW + x] = p
}
export function glyph(cv: Canvas, cx: number, cy: number, ch: string, fg: Paint, bg?: Paint) {
  cy += cv.oy / 2
  if (cx >= 0 && cx < STAGE_W && cy >= 0 && cy < cv.rows) cv.glyphs.set(cy * STAGE_W + cx, { ch, fg, bg })
}

export function quad(cv: Canvas, cx: number, cy: number): (Paint | null)[] {
  const i = 2 * cy * PW + 2 * cx
  return [cv.px[i] ?? null, cv.px[i + 1] ?? null, cv.px[i + PW] ?? null, cv.px[i + PW + 1] ?? null]
}
const bits = (q: (Paint | null)[], hit: (p: Paint | null) => boolean) => q.reduce((n, p, i) => (hit(p) ? n | (1 << i) : n), 0)

// One color a cell, the most-voted, as quadrants have always been drawn; and
// two when all four are filled with exactly two: the fewer (on a tie, the first
// in reading order) is the glyph, the other its background. Two colors and a
// hole, or three colors, cannot be drawn in a cell: those fall back on the
// vote, and no outfit makes one (wardrobe.test.ts).
export function toCells(cv: Canvas): Cell[][] {
  return Array.from({ length: cv.rows }, (_, cy) =>
    Array.from({ length: STAGE_W }, (_, cx): Cell => {
      const g = cv.glyphs.get(cy * STAGE_W + cx)
      if (g) return g
      const q = quad(cv, cx, cy)
      const votes = new Map<Paint, number>()
      for (const p of q) if (p) votes.set(p, (votes.get(p) ?? 0) + 1)
      if (votes.size === 2 && q.every(Boolean)) {
        const [[a], [b]] = [...votes].sort((x, y) => x[1] - y[1]) as [[Paint, number], [Paint, number]] // stable: a tie keeps reading order
        return { ch: QUAD[bits(q, p => p === a)] ?? ' ', fg: a, bg: b }
      }
      const fg = [...votes].sort((x, y) => y[1] - x[1])[0]?.[0] ?? TEXT
      return { ch: QUAD[bits(q, p => p !== null)] ?? ' ', fg }
    }),
  )
}
