// The gauge row: ctx, 5h and 7d fuel left. Each gauge is a rounded badge, a
// rounded capsule bar (1/8-cell precision over a dark track of its own hue)
// and its percentage, on one continuous OKLCH ramp: green at 100% -> red at 0%,
// the same stops as the effort pips in ~/.claude/statusline.sh. A glint sweeps
// the row, foreground and background; under LOW% a gauge breathes.

import { CAP_L, CAP_R, FAINT, TEXT, type Cell, type Paint } from './paint'

// tune: glint speed (columns/s), radius (columns), pause between sweeps (ms)
export const SPEED = 80
export const RADIUS = 2.5
export const PAUSE = 1800
const MAX_W = 16 // bar cells, shrunk down to MIN_W in a narrow band
const MIN_W = 6
const GAP = '   '
const LOW = 15 // % left under which a gauge breathes
const BREATH_MS = 1400

export type Gauge = { label: string; left: number | null; resetsAt?: number }
type Base = { ch: string; fg: Paint; bg?: Paint; breathe?: boolean }

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const clamp = (v: number) => Math.min(100, Math.max(0, v))

// fuel left -> its place on the ramp; i = 0 green .. 4 red
export function ramp(left: number): Paint {
  const i = 4 * (1 - clamp(left) / 100)
  return [0.82 - i * 0.035, 0.15 + i * 0.01, 150 - i * 32]
}

function when(resetsAt: number | undefined, now: number): string {
  if (resetsAt === undefined) return '--'
  const d = new Date(resetsAt)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return d.toDateString() === new Date(now).toDateString() ? hm : `${WEEKDAYS[d.getDay()]} ${hm}`
}

function layout(gauges: Gauge[], now: number, columns: number): Base[] {
  const tail = (g: Gauge) => (g.label === 'ctx' ? '' : ` ↻ ${when(g.resetsAt, now)}`)
  const fixed =
    gauges.reduce((n, g) => n + g.label.length + 2 + 1 + 2 + 5 + tail(g).length, 0) + GAP.length * (gauges.length - 1)
  const w = Math.max(MIN_W, Math.min(MAX_W, Math.floor((columns - fixed) / gauges.length)))

  const out: Base[] = []
  const put = (s: string, fg: Paint, bg?: Paint, breathe?: boolean) => {
    for (const ch of s) out.push({ ch, fg, bg, breathe })
  }

  gauges.forEach((g, n) => {
    if (n) put(GAP, TEXT)
    const known = g.left !== null
    const left = clamp(g.left ?? 0)
    const [L, C, hue] = ramp(left)
    const tint = known ? C : 0
    const low = known && left < LOW

    const badge: Paint = [0.33, tint * 0.4, hue]
    put(CAP_L, badge, undefined, low)
    put(g.label.toUpperCase(), [0.9, 0.06 * Math.sign(tint), hue], badge, low)
    put(CAP_R, badge, undefined, low)
    put(' ', TEXT)

    const track: Paint = [0.26, tint * 0.25, hue]
    const exact = (left * w) / 100
    let full = Math.floor(exact)
    let eighth = Math.round((exact - full) * 8)
    if (eighth === 8) (full += 1), (eighth = 0)
    const fill = (i: number): Paint => [L - 0.07 * (1 - i / Math.max(1, w - 1)), C, hue] // darker base, bright head
    put(CAP_L, known && full > 0 ? fill(0) : track)
    for (let i = 0; i < w; i++) {
      if (!known) put('╌', FAINT, track)
      else if (i < full) put('█', fill(i), track)
      else if (i === full && eighth) put(' ▏▎▍▌▋▊▉'[eighth] ?? ' ', fill(i), track)
      else put(' ', TEXT, track)
    }
    put(CAP_R, known && full >= w ? fill(w - 1) : track)

    put((known ? `${Math.round(left)}%` : '--').padStart(5), known ? [L, C, hue] : FAINT, undefined, low)
    const t = tail(g)
    if (t) put(t.slice(0, 2), FAINT), put(t.slice(2), TEXT)
  })
  return out
}

// The row at time t (ms): the glint is a soft bump running left to right, then
// resting for PAUSE; it lifts lightness and washes chroma, background too, so
// it crosses the tracks as a streak.
export function gaugeRow(gauges: Gauge[], now: number, t: number, columns = Infinity): Cell[] {
  const cells = layout(gauges, now, columns)
  const period = ((cells.length + 6 * RADIUS) / SPEED) * 1000 + PAUSE
  const pos = ((t % period) / 1000) * SPEED - 3 * RADIUS
  const breath = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / BREATH_MS)
  const lit = ([L, C, h]: Paint, k: number, b: number): Paint => [L + 0.16 * k + b, C * (1 - 0.5 * k), h]

  return cells.map((c, x) => {
    const d = x - pos
    const k = Math.exp((-d * d) / (2 * RADIUS * RADIUS))
    const b = c.breathe ? 0.09 * breath : 0
    return { ch: c.ch, fg: lit(c.fg, k, b), bg: c.bg && lit(c.bg, k, b) }
  })
}
