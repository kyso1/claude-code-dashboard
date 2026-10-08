// Colors in OKLCH and the Raster cell grid they are painted into.

export type Paint = readonly [L: number, C: number, hue: number]
export type Cell = { ch: string; fg: Paint; bg?: Paint }

export const TEXT: Paint = [0.7, 0.03, 275]
export const FAINT: Paint = [0.47, 0.02, 275]
export const CLAUDE = fromHex('#d77757') ?? [0.67, 0.13, 40]
const DEFAULT = 0x01000000 // the terminal's own color

const enc = (x: number) =>
  x <= 0 ? 0 : x >= 1 ? 255 : Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055))

export function rgb([L, C, deg]: Paint): number {
  const h = (deg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return (
    (enc(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) << 16) |
    (enc(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) << 8) |
    enc(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  )
}

// '#rrggbb' / '#rgb' -> OKLCH; undefined for anything else (ansi names, rgb())
export function fromHex(hex: string): Paint | undefined {
  const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim())
  if (!m?.[1]) return undefined
  const s = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1]
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(s.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const ss = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const A = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * ss
  const B = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * ss
  return [0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * ss, Math.hypot(A, B), (Math.atan2(B, A) * 180) / Math.PI]
}

export const lift = ([L, C, h]: Paint, dL: number, cMul = 1): Paint => [L + dL, C * cMul, h]

export const CAP_L = String.fromCharCode(0xe0b6) // Nerd Font half circles: rounded ends
export const CAP_R = String.fromCharCode(0xe0b4)

// Raster takes one printable width-1 BMP character a cell: keep ASCII, Latin
// accents and the glyphs drawn here; anything else (emoji, CJK) becomes '·'.
const DRAWN = /[\u2026\u203a\u2190-\u21ff\u22c6\u2500-\u25ff\u266a\u266b\u2713\u2722-\u273d\ue000-\uf8ff]/ // last range: Nerd Font icons
export const safe = (s: string) =>
  [...s].map(ch => (/[\x20-\x7e\u00a0-\u024f]/.test(ch) || DRAWN.test(ch) ? ch : '\u00b7')).join('')

export const text = (s: string, fg: Paint, bg?: Paint): Cell[] => [...safe(s)].map(ch => ({ ch, fg, bg }))

export function fit(cells: Cell[], width: number): Cell[] {
  if (cells.length <= width) return cells
  return [...cells.slice(0, Math.max(0, width - 1)), { ch: '…', fg: cells[width - 1]?.fg ?? FAINT }]
}

export function encode(rows: Cell[][], columns: number): string {
  const words = new Uint32Array(rows.length * columns * 3)
  rows.forEach((row, y) => {
    for (let x = 0; x < columns; x++) {
      const c = row[x]
      const i = (y * columns + x) * 3
      words[i] = c?.ch.codePointAt(0) ?? 0x20
      words[i + 1] = c ? rgb(c.fg) : DEFAULT
      words[i + 2] = c?.bg ? rgb(c.bg) : DEFAULT
    }
  })
  return new Uint8Array(words.buffer).toBase64()
}

declare global {
  interface Uint8Array {
    toBase64(): string // ES2026: in the engine's runtime, not yet in lib es2023
  }
}
