// What the mascot wears (/boneco, parts 2 to 5): body color, eyes, cheeks,
// silhouette and hat, in the quadrant pixels of pixels.ts. Each piece keeps the
// cells it touches to one color with holes, or two colors with none: a third
// state cannot be drawn in one cell (toCells), and wardrobe.test.ts checks
// that no outfit makes one.

import type { HatKey, Look } from './look'
import { mix, type Palette } from './palettes'
import { fromHex, lift, type Paint } from './paint'
import { dot, type Canvas } from './pixels'

export type Scene = 'cook' | 'think' | 'build' | 'dance' | 'walk' | 'magic' | 'grow' | 'wind'
export type Eyes = 'front' | 'up' | 'shut'

// --- body color (part 2) ----------------------------------------------------------

export const MODEL_COLORS: Record<string, Paint> = { Opus: [0.67, 0.13, 40], Sonnet: [0.7, 0.12, 250], Haiku: [0.8, 0.14, 150], Fable: [0.7, 0.15, 315] }
export const SCENE_HUE: Record<Scene, number> = { cook: 45, think: 255, build: 90, walk: 170, magic: 305, dance: 350, grow: 140, wind: 215 }
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
const ALARM: Paint = [0.64, 0.17, 25]

export type BodyCtx = { ctxLeft?: number; model?: string; effortLevel?: string }

// `accent`: the palette's (the theme's, on 'tema'); `model` as the band shows it ("Opus 5.5")
export function bodyColor(look: Look, accent: Paint, pal: Palette, t: number, scene: Scene | undefined, o: BodyCtx = {}): Paint {
  switch (look.color) {
    case 'fixa':
      return fromHex(look.fixed) ?? accent
    case 'arco':
      return [0.75, 0.15, (t / 28) % 360]
    case 'modelo':
      return MODEL_COLORS[(o.model ?? '').split(' ')[0] ?? ''] ?? accent
    case 'cena':
      return scene ? [0.73, 0.14, SCENE_HUE[scene]] : accent
    case 'contexto': {
      const left = o.ctxLeft ?? 100 // unknown: as if full
      const pale = lift(accent, 0.08, 0.3)
      if (left >= 50) return accent
      if (left >= 15) return mix(accent, pale, (50 - left) / 35)
      return mix(pale, ALARM, Math.min(1, (15 - left) / 10))
    }
    case 'effort': {
      const n = EFFORTS.indexOf(o.effortLevel ?? '')
      return n < 0 ? accent : pal.ramp(100 - 25 * n)
    }
    default:
      return accent
  }
}

// dois tons: the head lighter, the base darker; the change falls between cell rows
export const tones = (look: Look, c: Paint): [Paint, Paint] => (look.duo ? [lift(c, 0.07, 0.85), lift(c, -0.05, 1.05)] : [c, c])

// --- eyes and cheeks (part 3) -----------------------------------------------------

export const BLUSH: Paint = [0.76, 0.13, 5]
const SHADE: Paint = [0.2, 0.02, 270]
const GLINT: Paint = [0.9, 0.02, 250]
const VISOR: Paint = [0.24, 0.04, 250]
const SCAN: Paint = [0.86, 0.15, 200]
const EYE_PX: Record<Eyes, number[][]> = { front: [[5, 1], [12, 1]], up: [[5, 0], [12, 0]], shut: [] }

export function face(cv: Canvas, x0: number, eyes: Eyes, look: Look, t: number) {
  switch (look.eyes) {
    case 'vazados':
      for (const [x = 0, y = 0] of EYE_PX[eyes]) dot(cv, x0 + x, y, null)
      return
    case 'grandes': // two pixels tall: looking up changes nothing
      if (eyes !== 'shut') for (const x of [5, 12]) dot(cv, x0 + x, 0, null), dot(cv, x0 + x, 1, null)
      return
    case 'led': {
      const lc = fromHex(look.led) ?? SCAN
      for (const [x = 0, y = 0] of EYE_PX[eyes]) dot(cv, x0 + x, y, lc)
      return
    }
    case 'oculos': {
      const g = t % 3400 // a glint crosses the left lens, then the right
      const left = g < 150 ? GLINT : SHADE
      const right = g >= 150 && g < 300 ? GLINT : SHADE
      for (const x of [4, 5]) dot(cv, x0 + x, 1, left)
      for (const x of [12, 13]) dot(cv, x0 + x, 1, right)
      return
    }
    case 'visor': {
      for (let x = 4; x <= 13; x++) dot(cv, x0 + x, 1, VISOR)
      const k = Math.floor(t / 150) % 8 // the light sweeps cell by cell, there and back
      const at = 4 + 2 * (k < 5 ? k : 8 - k)
      dot(cv, x0 + at, 1, SCAN), dot(cv, x0 + at + 1, 1, SCAN)
    }
  }
}

// --- silhouette (part 4) ------------------------------------------------------------

export function carved(shape: Look['shape'], x: number, y: number): boolean {
  if (shape === 'orelhas') return y === 0 && x >= 6 && x <= 11
  if (shape === 'redondo') return (y === 0 || y === 3) && (x === 3 || x === 14)
  return false
}

// fantasminha: no legs, the bottom row ripples a pixel at a time
export function ghostHem(cv: Canvas, x0: number, t: number, p: Paint) {
  const ph = Math.floor(t / 240) % 2
  for (let x = 3; x <= 14; x++) if ((x + ph) % 2 === 0) dot(cv, x0 + x, 4, p)
}

// --- hats (part 5): two pixel rows above the head, y -2 and -1 ---------------------

const INK: Paint = [0.36, 0.03, 275]
const BAND: Paint = [0.6, 0.19, 25]
const CHEF: Paint = [0.96, 0.005, 250]
const CHEF2: Paint = [0.86, 0.01, 250]
const GOLD: Paint = [0.88, 0.15, 95]
const RUBY: Paint = [0.6, 0.2, 15]
const CAP: Paint = [0.62, 0.15, 255]
const CAP2: Paint = [0.5, 0.13, 255]
const PINK: Paint = [0.76, 0.15, 350]
const DEVIL: Paint = [0.6, 0.2, 27]
const WITCH: Paint = [0.5, 0.16, 305]
const HARD: Paint = [0.84, 0.17, 85]
const SANTA: Paint = [0.58, 0.2, 27]
const STRAW: Paint = [0.83, 0.1, 88]
const STRAW2: Paint = [0.7, 0.1, 78]
const BOW: Paint = [0.74, 0.17, 355]

// [x from, x to, y, color]; 'body' is the head's color, 'halo' a breathing gold
type HatRun = readonly [from: number, to: number, y: -2 | -1, paint: Paint | 'body' | 'halo']
export const HAT_PIXELS: Record<HatKey, readonly HatRun[]> = {
  cartola: [[6, 11, -2, INK], [4, 5, -1, INK], [6, 11, -1, BAND], [12, 13, -1, INK]],
  chef: [[5, 12, -2, CHEF], [6, 11, -1, CHEF2]],
  coroa: [[5, 5, -2, GOLD], [8, 9, -2, RUBY], [12, 12, -2, GOLD], [5, 12, -1, GOLD]],
  bone: [[5, 12, -2, CAP], [4, 13, -1, CAP], [14, 16, -1, CAP2]],
  festa: [[8, 9, -2, GOLD], [7, 10, -1, PINK]],
  aureola: [[6, 11, -2, 'halo']],
  antenas: [[4, 4, -2, 'body'], [5, 5, -1, 'body'], [13, 13, -2, 'body'], [12, 12, -1, 'body']],
  chifres: [[3, 3, -2, DEVIL], [4, 4, -1, DEVIL], [14, 14, -2, DEVIL], [13, 13, -1, DEVIL]],
  gato: [[4, 4, -2, 'body'], [4, 5, -1, 'body'], [13, 13, -2, 'body'], [12, 13, -1, 'body']],
  bruxo: [[9, 11, -2, WITCH], [3, 14, -1, WITCH]],
  obra: [[5, 12, -2, HARD], [3, 14, -1, HARD]],
  noel: [[6, 11, -2, SANTA], [12, 13, -2, CHEF], [4, 13, -1, CHEF]],
  palha: [[6, 11, -2, STRAW], [2, 15, -1, STRAW2]],
  laco: [[11, 11, -2, BOW], [14, 14, -2, BOW], [11, 14, -1, BOW]],
}

const SCENE_HAT: Record<Scene, HatKey> = { cook: 'chef', build: 'obra', magic: 'bruxo', dance: 'festa', walk: 'bone', grow: 'palha', wind: 'noel', think: 'cartola' }
const SEASON_HAT: Partial<Record<number, HatKey>> = { 9: 'bruxo', 11: 'noel', 5: 'palha', 6: 'palha', 0: 'festa' } // by month, 0 = January

export function hatFor(hat: Look['hat'], scene: Scene | undefined, month: number): HatKey | null {
  if (hat === 'none') return null
  if (hat === 'cena') return scene ? SCENE_HAT[scene] : null
  if (hat === 'sazonal') return SEASON_HAT[month] ?? null
  return hat
}

// a hat, even an automatic one between hats, keeps the band at 4 rows: it never jumps
export const rowsFor = (look: Look): 3 | 4 => (look.hat === 'none' ? 3 : 4)

export function wearHat(cv: Canvas, x0: number, hat: HatKey, body: Paint, t: number) {
  const halo = lift(GOLD, 0.05 * Math.sin(t / 300))
  for (const [from, to, y, k] of HAT_PIXELS[hat])
    for (let x = from; x <= to; x++) dot(cv, x0 + x, y, k === 'body' ? body : k === 'halo' ? halo : k)
}
