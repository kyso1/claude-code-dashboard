// What the person picked for the mini Claude and the band (/boneco), kept in
// $.store under 'look'. Read field by field: the store may hold an older shape
// or garbage, and a bad field falls back on its own default alone.

export const PALETTE_KEYS = ['tema', 'classico', 'chamados', 'catppuccin', 'dracula', 'tokyo', 'nord', 'gruvbox', 'rose', 'synth', 'fosforo', 'ambar', 'acessivel', 'papel'] as const
export const COLORS = ['paleta', 'fixa', 'arco', 'modelo', 'cena', 'contexto', 'effort'] as const
export const EYE_MODES = ['vazados', 'grandes', 'led', 'oculos', 'visor'] as const
export const SHAPES = ['classica', 'orelhas', 'redondo', 'fantasma'] as const
export const HAT_KEYS = ['cartola', 'chef', 'coroa', 'bone', 'festa', 'aureola', 'antenas', 'chifres', 'gato', 'bruxo', 'obra', 'noel', 'palha', 'laco'] as const
export const HATS = ['none', ...HAT_KEYS, 'cena', 'sazonal'] as const
export const EXTRAS = ['susto', 'suor', 'aceno', 'ocio', 'pet'] as const

export type PaletteKey = (typeof PALETTE_KEYS)[number]
export type HatKey = (typeof HAT_KEYS)[number]
export type Extra = (typeof EXTRAS)[number]
export type Look = {
  palette: PaletteKey
  color: (typeof COLORS)[number]
  fixed: string // '#rrggbb', with color 'fixa'
  duo: boolean // dois tons
  eyes: (typeof EYE_MODES)[number]
  led: string // '#rrggbb', with eyes 'led'
  cheeks: boolean
  shape: (typeof SHAPES)[number]
  hat: (typeof HATS)[number]
  extras: Extra[]
}

export const DEFAULT_LOOK: Look = {
  palette: 'tema', color: 'paleta', fixed: '#d77757', duo: false, eyes: 'vazados',
  led: '#5ee6ff', cheeks: false, shape: 'classica', hat: 'none', extras: [],
}

const HEX = /^#[0-9a-f]{6}$/i
export const isHex = (v: string) => HEX.test(v)
const one = <T extends string>(list: readonly T[], v: unknown, d: T): T => ((list as readonly unknown[]).includes(v) ? (v as T) : d)
const hex = (v: unknown, d: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d)
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)

export function readLook(raw: unknown): Look {
  const r = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_LOOK
  const extras = Array.isArray(r.extras) ? (r.extras as unknown[]) : []
  return {
    palette: one(PALETTE_KEYS, r.palette, d.palette),
    color: one(COLORS, r.color, d.color),
    fixed: hex(r.fixed, d.fixed),
    duo: bool(r.duo, d.duo),
    eyes: one(EYE_MODES, r.eyes, d.eyes),
    led: hex(r.led, d.led),
    cheeks: bool(r.cheeks, d.cheeks),
    shape: one(SHAPES, r.shape, d.shape),
    hat: one(HATS, r.hat, d.hat),
    extras: EXTRAS.filter(x => extras.includes(x)), // known ones, once each, in a fixed order
  }
}
