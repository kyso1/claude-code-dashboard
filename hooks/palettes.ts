// The band's palettes (/boneco, part 1): the mascot's and the model badge's
// accent, the ramp the gauges and effort pips run on (100 full -> 0 empty), and
// the text, folder and branch colors. 'tema' is the band as it always was: the
// theme's `claude` color on the classic palette.

import type { PaletteKey } from './look'
import { CLAUDE, FAINT, TEXT, fromHex, type Paint } from './paint'

export type Palette = {
  key: PaletteKey
  name: string
  note: string
  accent: Paint
  ramp: (left: number) => Paint
  text: Paint
  faint: Paint
  folder: Paint
  branch: Paint
  dark: boolean // false: light badges and tracks, for a light terminal
}

const clamp = (v: number) => Math.min(100, Math.max(0, v))

// green at 100% -> red at 0%, as ~/.claude/statusline.sh had it
export function classicRamp(left: number): Paint {
  const i = 4 * (1 - clamp(left) / 100)
  return [0.82 - i * 0.035, 0.15 + i * 0.01, 150 - i * 32]
}

// OKLCH, the hue the short way round
export function mix(a: Paint, b: Paint, k: number): Paint {
  const d = ((((b[2] - a[2]) % 360) + 540) % 360) - 180
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + d * k]
}

const hex = (h: string): Paint => fromHex(h) ?? CLAUDE
function stopsRamp(stops: string[]): (left: number) => Paint {
  const s = stops.map(hex)
  return left => {
    const x = (1 - clamp(left) / 100) * (s.length - 1)
    const i = Math.min(s.length - 2, Math.floor(x))
    return mix(s[i]!, s[i + 1]!, x - i)
  }
}

type Spec = { key: PaletteKey; name: string; note: string; accent: string; stops: string[]; text: string; faint: string; folder: string; branch: string; dark?: false }
const make = (p: Spec): Palette => ({
  key: p.key, name: p.name, note: p.note, accent: hex(p.accent), ramp: stopsRamp(p.stops),
  text: hex(p.text), faint: hex(p.faint), folder: hex(p.folder), branch: hex(p.branch), dark: p.dark ?? true,
})

export const CLASSIC: Palette = {
  key: 'classico', name: 'Clássico', note: 'O laranja do Claude e a rampa verde → vermelho de hoje.',
  accent: CLAUDE, ramp: classicRamp, text: TEXT, faint: FAINT, folder: [0.74, 0.11, 300], branch: [0.8, 0.11, 165], dark: true,
}

export const PALETTES: readonly Palette[] = [
  { ...CLASSIC, key: 'tema', name: 'Do /theme', note: 'O destaque do seu tema do Claude Code sobre o clássico, como a faixa sempre foi.' },
  CLASSIC,
  make({ key: 'chamados', name: 'Chamados', note: 'O seu tema do PortalChamados: lima da marca, status do portal nos medidores.',
    accent: '#50b838', stops: ['#4ade80', '#fbbf24', '#f47920', '#f87171'], text: '#a1a1aa', faint: '#5f5f69', folder: '#a78bfa', branch: '#60a5fa' }),
  make({ key: 'catppuccin', name: 'Catppuccin Mocha', note: 'Pastel sobre azul-ardósia. Mauve no mascote.',
    accent: '#cba6f7', stops: ['#a6e3a1', '#f9e2af', '#fab387', '#f38ba8'], text: '#bac2de', faint: '#6c7086', folder: '#b4befe', branch: '#94e2d5' }),
  make({ key: 'dracula', name: 'Dracula', note: 'Roxo, rosa e ciano em alto contraste.',
    accent: '#bd93f9', stops: ['#50fa7b', '#f1fa8c', '#ffb86c', '#ff5555'], text: '#e2e2dc', faint: '#6272a4', folder: '#ff79c6', branch: '#8be9fd' }),
  make({ key: 'tokyo', name: 'Tokyo Night', note: 'Azul elétrico sobre noite fria.',
    accent: '#7aa2f7', stops: ['#9ece6a', '#e0af68', '#ff9e64', '#f7768e'], text: '#a9b1d6', faint: '#565f89', folder: '#bb9af7', branch: '#73daca' }),
  make({ key: 'nord', name: 'Nord', note: 'Gelo e aurora boreal, tudo mais calmo.',
    accent: '#88c0d0', stops: ['#a3be8c', '#ebcb8b', '#d08770', '#bf616a'], text: '#d8dee9', faint: '#616e88', folder: '#b48ead', branch: '#8fbcbb' }),
  make({ key: 'gruvbox', name: 'Gruvbox', note: 'Retrô quente, cara de terminal dos anos 80.',
    accent: '#fe8019', stops: ['#b8bb26', '#fabd2f', '#fe8019', '#fb4934'], text: '#d5c4a1', faint: '#7c6f64', folder: '#d3869b', branch: '#8ec07c' }),
  make({ key: 'rose', name: 'Rosé Pine', note: 'Rosa suave; a rampa vai de espuma a vinho.',
    accent: '#ebbcba', stops: ['#9ccfd8', '#f6c177', '#ea9a97', '#eb6f92'], text: '#e0def4', faint: '#6e6a86', folder: '#c4a7e7', branch: '#9ccfd8' }),
  make({ key: 'synth', name: 'Synthwave', note: 'Neon rosa e ciano, medidores de menta a vermelho.',
    accent: '#ff7edb', stops: ['#72f1b8', '#36f9f6', '#fede5d', '#fe4450'], text: '#e0d7f5', faint: '#7a6a9a', folder: '#fede5d', branch: '#36f9f6' }),
  make({ key: 'fosforo', name: 'Fósforo', note: 'Monitor CRT verde. Medidores só mudam de brilho.',
    accent: '#5cff8a', stops: ['#8dffaa', '#46d872', '#2a9a4c', '#1d6a35'], text: '#5fd387', faint: '#2f6b45', folder: '#8dffaa', branch: '#8dffaa' }),
  make({ key: 'ambar', name: 'Âmbar', note: 'Terminal âmbar monocromático.',
    accent: '#ffb000', stops: ['#ffcd55', '#e09a00', '#a86f00', '#7a4f00'], text: '#e8a33a', faint: '#7a5a20', folder: '#ffcd55', branch: '#ffcd55' }),
  make({ key: 'acessivel', name: 'Daltonismo', note: 'Rampa azul → laranja, que funciona para quem não distingue verde de vermelho.',
    accent: '#d77757', stops: ['#4ea1ff', '#9fb4d9', '#f2c14e', '#f07b2a'], text: '#c9cbd6', faint: '#6b6f80', folder: '#b39cf0', branch: '#4ea1ff' }),
  make({ key: 'papel', name: 'Papel', note: 'Para terminal de fundo claro: tinta escura, selos claros.', dark: false,
    accent: '#c15f3c', stops: ['#1f9d55', '#a88a06', '#d9730d', '#d0312d'], text: '#3f4250', faint: '#8a8d9a', folder: '#7c4dcc', branch: '#0f8a6a' }),
]

export function paletteOf(key: PaletteKey, themeAccent: Paint): Palette {
  const p = PALETTES.find(p => p.key === key) ?? PALETTES[0]!
  return p.key === 'tema' ? { ...p, accent: themeAccent } : p
}
