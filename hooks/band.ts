// The band's rows, as register.tsx draws them and the /boneco preview shows a
// palette: the stage on the left (3 rows, 4 with a hat) and, beside its last
// three, who is working, what it is doing and the fuel gauges.

import { STAGE_W, caption, stage, type Mood, type Reaction, type Scene, type Tool } from './clawd'
import { gaugeRow, type Gauge } from './gauges'
import { identityRow, type Identity } from './identity'
import type { Look } from './look'
import { paletteOf } from './palettes'
import { CLAUDE, fit, type Cell, type Paint } from './paint'
import { bodyColor } from './wardrobe'

export type BandState = {
  mood: Mood
  tool?: Tool
  scene?: Scene
  gauges: Gauge[]
  ident: Identity
  themeAccent: Paint
  look: Look
  reaction?: Reaction
  name?: string
}

const GAP: Cell[] = [{ ch: ' ', fg: CLAUDE }, { ch: ' ', fg: CLAUDE }]
export const MIN_RIGHT = 60 // narrower than this beside the stage: drop the stage

export function composeBand(b: BandState, now: number, columns: number): Cell[][] {
  const pal = paletteOf(b.look.palette, b.themeAccent)
  const o = {
    look: b.look, palette: pal, reaction: b.reaction, model: b.ident.model, effortLevel: b.ident.effort,
    ctxLeft: b.gauges.find(g => g.label === 'ctx')?.left ?? undefined,
  }
  const body = bodyColor(b.look, pal.accent, pal, now, b.mood.working ? b.scene : undefined, o)
  const side = (w: number) => [
    identityRow(b.ident, pal.accent, pal),
    caption(b.mood, b.tool, now, w, body, b.scene, b.name, pal),
    gaugeRow(b.gauges, now, now, w, pal),
  ]
  const right = columns - STAGE_W - GAP.length
  if (right < MIN_RIGHT) return side(columns).map(row => fit(row, columns))
  const rhs = side(right)
  const st = stage(b.mood, now, pal.accent, b.scene, o)
  const off = st.length - 3
  return st.map((row, i) => [...row, ...GAP, ...fit(rhs[i - off] ?? [], right)])
}
