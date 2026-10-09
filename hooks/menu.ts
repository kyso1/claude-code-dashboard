// /boneco: the menu that picks the look one part at a time (paleta, cor, olhos,
// silhueta, chapéu, reações), the option under the focus ring previewed live.
// This half is pure: the parts and their options, what a press does to the
// look, the preview's rows. register.tsx draws the pane and owns $.

import { composeBand, type BandState } from './band'
import { STAGE_W, VERBS, stage, type Mood, type Scene } from './clawd'
import { EXTRAS, isHex, type Extra, type Look } from './look'
import { PALETTES, paletteOf } from './palettes'
import { fit, text, type Cell } from './paint'

export const MENU_ID = 'boneco'
export const PREVIEW_KEY = 'boneco-preview'

export type StepKey = 'palette' | 'color' | 'eyes' | 'shape' | 'hat' | 'extras'
export const STEPS: readonly { key: StepKey; arg: string; title: string }[] = [
  { key: 'palette', arg: 'paleta', title: 'Paleta' },
  { key: 'color', arg: 'cor', title: 'Cor' },
  { key: 'eyes', arg: 'olhos', title: 'Olhos' },
  { key: 'shape', arg: 'silhueta', title: 'Silhueta' },
  { key: 'hat', arg: 'chapeu', title: 'Chapéu' },
  { key: 'extras', arg: 'reacoes', title: 'Reações' },
]
export const SUMMARY = STEPS.length // the step after the last part

export type Option = { id: string; value: string; name: string; note: string; tag?: string }
const LINE = '+1 linha na faixa'

export const OPTIONS: Record<StepKey, Option[]> = {
  palette: PALETTES.map((p, i) => ({ id: `P${i}`, value: p.key, name: p.name, note: p.note })),
  color: [
    { id: 'C1', value: 'paleta', name: 'Da paleta', note: 'O destaque da paleta, como o mod faz hoje com o /theme.' },
    { id: 'C2', value: 'fixa', name: 'Cor fixa', note: 'Uma cor só dele, igual em qualquer paleta.' },
    { id: 'C3', value: 'arco', name: 'Arco-íris', note: 'O matiz gira devagar, uma volta a cada 10 s.' },
    { id: 'C4', value: 'modelo', name: 'Pelo modelo', note: 'Opus laranja, Sonnet azul, Haiku verde, Fable roxo.' },
    { id: 'C5', value: 'cena', name: 'Pela cena', note: 'Cozinha laranja, leitura azul, mágica roxa, dança rosa…' },
    { id: 'C6', value: 'contexto', name: 'Pelo contexto', note: 'Desbota abaixo de 50% de contexto e avermelha abaixo de 15%.' },
    { id: 'C7', value: 'effort', name: 'Pelo effort', note: 'A mesma rampa dos pips: low frio, max quente.' },
  ],
  eyes: [
    { id: 'O1', value: 'vazados', name: 'Vazados', note: 'Os furos de hoje, que mostram o fundo do terminal.' },
    { id: 'O2', value: 'grandes', name: 'Grandes', note: 'Dois pixels de altura. Perdem o olhar para cima.' },
    { id: 'O3', value: 'led', name: 'LED', note: 'Acesos numa cor; continuam piscando.' },
    { id: 'O4', value: 'oculos', name: 'Óculos escuros', note: 'Lentes escuras com um reflexo a cada 3 s.' },
    { id: 'O5', value: 'visor', name: 'Visor', note: 'Faixa escura com uma luz que varre de um lado a outro.' },
  ],
  shape: [
    { id: 'S1', value: 'classica', name: 'Clássica', note: 'O desenho da tela de boas-vindas.' },
    { id: 'S2', value: 'orelhas', name: 'Orelhinhas', note: 'Recorte no topo da cabeça. Some quando há chapéu.' },
    { id: 'S3', value: 'redondo', name: 'Cantos redondos', note: 'Quatro cantos a menos, mais fofo.' },
    { id: 'S4', value: 'fantasma', name: 'Fantasminha', note: 'Sem pernas: a barra de baixo ondula.' },
  ],
  hat: [
    { id: 'H0', value: 'none', name: 'Sem chapéu', note: 'Faixa com 3 linhas, como hoje.' },
    { id: 'H1', value: 'cartola', name: 'Cartola', note: 'Preta com fita vermelha.', tag: LINE },
    { id: 'H2', value: 'chef', name: 'Chapéu de chef', note: 'Toque branco, ótimo com a cena de cozinha.', tag: LINE },
    { id: 'H3', value: 'coroa', name: 'Coroa', note: 'Dourada, com uma pedra no meio.', tag: LINE },
    { id: 'H4', value: 'bone', name: 'Boné', note: 'Aba virada para o lado.', tag: LINE },
    { id: 'H5', value: 'festa', name: 'Chapéu de festa', note: 'Cone rosa com pompom.', tag: LINE },
    { id: 'H6', value: 'aureola', name: 'Auréola', note: 'Flutua e brilha devagar.', tag: LINE },
    { id: 'H7', value: 'antenas', name: 'Anteninhas', note: 'Da cor do corpo, de inseto.', tag: LINE },
    { id: 'H8', value: 'chifres', name: 'Chifrinhos', note: 'Vermelhos, de diabinho.', tag: LINE },
    { id: 'H9', value: 'gato', name: 'Orelhas de gato', note: 'Da cor do corpo.', tag: LINE },
    { id: 'H10', value: 'bruxo', name: 'Chapéu de bruxo', note: 'Roxo, de aba larga.', tag: LINE },
    { id: 'H11', value: 'obra', name: 'Capacete de obra', note: 'Amarelo, combina com a cena de construir.', tag: LINE },
    { id: 'H12', value: 'noel', name: 'Gorro de Noel', note: 'Vermelho com pompom branco.', tag: LINE },
    { id: 'H13', value: 'palha', name: 'Chapéu de palha', note: 'Aba bem larga, de festa junina.', tag: LINE },
    { id: 'H14', value: 'laco', name: 'Laço', note: 'Rosa, preso de lado.', tag: LINE },
    { id: 'H15', value: 'cena', name: 'Figurino por cena', note: 'Chef na cozinha, capacete na obra, bruxo na mágica, festa na dança…', tag: LINE },
    { id: 'H16', value: 'sazonal', name: 'Do calendário', note: 'Bruxo em outubro, gorro em dezembro, palha em junho, festa em janeiro.', tag: LINE },
  ],
  extras: [
    { id: 'X1', value: 'susto', name: 'Susto no erro', note: 'Uma ferramenta falhou: treme, olha para cima e mostra "!".' },
    { id: 'X2', value: 'suor', name: 'Suando', note: 'Contexto abaixo de 15%: fica pálido e sua.' },
    { id: 'X3', value: 'aceno', name: 'Aceno', note: 'Esperando sua permissão: acena e mostra "?".' },
    { id: 'X4', value: 'ocio', name: 'Ócio variado', note: 'Parado, olha em volta, boceja, se espreguiça e bate o pé.' },
    { id: 'X5', value: 'pet', name: 'Bichinho', note: 'Um companheiro de duas células que vai atrás dele.' },
  ],
}

export const SWATCHES: Record<'fixa' | 'led', readonly (readonly [hex: string, name: string])[]> = {
  fixa: [['#d77757', 'laranja Claude'], ['#f28fb3', 'rosa'], ['#6fa8ff', 'azul'], ['#7bd88f', 'verde'], ['#b18cff', 'roxo'], ['#f2c94c', 'amarelo'], ['#e8e8ee', 'branco'], ['#8b93a7', 'cinza robô']],
  led: [['#5ee6ff', 'ciano'], ['#7dff9a', 'verde'], ['#ffc94d', 'âmbar'], ['#ff5d6c', 'vermelho'], ['#ffffff', 'branco']],
}

// option keys, 17 for the hats: 1-9 then letters, skipping c f r t v (the fixed buttons')
const KEYS = '123456789abdeghij'
export const hotkey = (i: number): string | undefined => KEYS[i]

export type MenuState = { step: number; sub?: 'fixa' | 'led'; focused?: string; error?: string }
export type Press = { look: Look; state: MenuState; close?: true }

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
export const openAt = (arg: string): MenuState => ({ step: Math.max(0, STEPS.findIndex(s => s.arg === plain(arg))) })

const split = (key: string): [string, string] => {
  const i = key.indexOf(':')
  return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)]
}
const stepAt = (s: MenuState) => STEPS[s.step]?.key
const known = (key: StepKey, value: string) => OPTIONS[key].some(o => o.value === value)

export const isPicked = (look: Look, key: StepKey, value: string) =>
  key === 'extras' ? look.extras.includes(value as Extra) : look[key] === value

function apply(look: Look, key: StepKey, value: string): Look {
  if (key !== 'extras') return { ...look, [key]: value } as Look
  const on = look.extras.includes(value as Extra)
  return { ...look, extras: EXTRAS.filter(x => (x === value ? !on : look.extras.includes(x))) }
}
const swatch = (look: Look, sub: 'fixa' | 'led', hex: string): Look => ({ ...look, [sub === 'fixa' ? 'fixed' : 'led']: hex.toLowerCase() }) as Look

export function press(look: Look, s: MenuState, key: string): Press {
  const step = stepAt(s)
  const [kind, value] = split(key)
  const stay = { look, state: s }
  if (kind === 'opt') {
    if (!step || !known(step, value)) return stay
    const next = apply(look, step, value)
    if (step === 'extras') return { look: next, state: { step: s.step } }
    const sub = step === 'color' && value === 'fixa' ? 'fixa' : step === 'eyes' && value === 'led' ? 'led' : undefined
    if (sub) return { look: next, state: { step: s.step, sub } }
    return { look: next, state: { step: s.step + 1 } }
  }
  if (kind === 'sw') return s.sub && isHex(value) ? { look: swatch(look, s.sub, value), state: { step: s.step + 1 } } : stay
  if (kind === 'tog') return value === 'duo' || value === 'cheeks' ? { look: { ...look, [value]: !look[value] } as Look, state: s } : stay
  if (kind === 'nav') {
    if (value === 'back') return { look, state: s.sub ? { step: s.step } : { step: Math.max(0, s.step - 1) } }
    if (value === 'next') return { look, state: { step: Math.min(SUMMARY, s.step + 1) } }
    if (value === 'restart') return { look, state: { step: 0 } }
    if (value === 'close') return { look, state: s, close: true }
  }
  return stay
}

// the hex typed in the fixed color's field: '#a1b2c3', 'A1B2C3' and spaces around are fine
export function typeHex(look: Look, s: MenuState, typed: string): Press {
  if (s.sub !== 'fixa') return { look, state: s }
  const hex = `#${typed.trim().replace(/^#/, '')}`.toLowerCase()
  if (!isHex(hex)) return { look, state: { ...s, error: `"${typed.trim().slice(0, 16)}" não é uma cor: use #rrggbb` } }
  return { look: swatch(look, 'fixa', hex), state: { step: s.step + 1 } }
}

// the look with the focused option on, unsaved; on Reações the focused one shown on
export function preview(look: Look, s: MenuState): Look {
  const step = stepAt(s)
  const [kind, value] = split(s.focused ?? '')
  if (kind === 'opt' && step && known(step, value)) return step === 'extras' && isPicked(look, step, value) ? look : apply(look, step, value)
  if (kind === 'sw' && s.sub && isHex(value)) return swatch(look, s.sub, value)
  return look
}

export function title(s: MenuState): string {
  const st = STEPS[s.step]
  return st ? `Mini Claude · ${s.step + 1}/${STEPS.length} ${st.title}` : 'Mini Claude · pronto'
}

export const progress = (s: MenuState): string =>
  STEPS.map((st, i) => `${i < s.step ? '✓' : i === s.step ? '●' : '○'}${st.title}`).join(' ')

export function summary(look: Look): string[] {
  const named = (key: StepKey, value: string) => {
    const o = OPTIONS[key].find(o => o.value === value)
    return o ? `${o.id} ${o.name}` : value
  }
  return [
    `Paleta: ${named('palette', look.palette)}`,
    `Cor: ${named('color', look.color)}${look.color === 'fixa' ? ` ${look.fixed}` : ''}${look.duo ? ' + dois tons' : ''}`,
    `Olhos: ${named('eyes', look.eyes)}${look.eyes === 'led' ? ` ${look.led}` : ''}${look.cheeks ? ' + bochechas' : ''}`,
    `Silhueta: ${named('shape', look.shape)}`,
    `Chapéu: ${named('hat', look.hat)}`,
    `Reações: ${look.extras.length ? look.extras.map(x => named('extras', x)).join(', ') : 'nenhuma'}`,
  ]
}

// the preview acts out every scene in turn, 2.4 s each, so a color or a hat is seen everywhere
const DEMO: (Scene | 'idle')[] = ['idle', 'dance', 'cook', 'think', 'build', 'walk', 'magic', 'grow', 'wind']
function demo(t: number): { mood: Mood; scene?: Scene } {
  const s = DEMO[Math.floor(t / 2400) % DEMO.length] ?? 'idle'
  if (s === 'idle') return { mood: { working: false, since: t - 1000 } }
  return { mood: { working: true, since: t, word: VERBS[s].split(' ')[0], mode: 'thinking' }, scene: s }
}

// Paleta: the whole band; the other parts: the stage and, beside it, the option's name and note
export function previewRows(b: BandState, s: MenuState, now: number, columns: number): Cell[][] {
  const look = preview(b.look, s)
  const step = stepAt(s)
  if (step === 'palette') return composeBand({ ...b, look }, now, columns)
  const pal = paletteOf(look.palette, b.themeAccent)
  const { mood, scene } = demo(now)
  const st = stage(mood, now, pal.accent, scene, {
    look, palette: pal, model: b.ident.model, effortLevel: b.ident.effort,
    ctxLeft: step === 'extras' ? 9 : step === 'color' ? 100 - ((now / 90) % 100) : 72,
    reaction: step === 'extras' ? { sustoAt: now - (now % 2600), waiting: true } : undefined, // a startle, then a wave, over and over
  })
  const [kind, value] = split(s.focused ?? '')
  const o = step ? (OPTIONS[step].find(o => kind === 'opt' && o.value === value) ?? OPTIONS[step].find(o => isPicked(look, step, o.value))) : undefined
  const lines = o ? [text(`${o.id} ${o.name}`, pal.text), text(o.note, pal.faint), text(o.tag ?? '', pal.faint)] : []
  const right = Math.max(0, columns - STAGE_W - 2)
  const off = st.length - 3
  return st.map((row, i) => [...row, ...text('  ', pal.text), ...fit(lines[i - off] ?? [], right)])
}
