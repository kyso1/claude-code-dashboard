import { expect, test } from 'claude-code/testing'

import type { BandState } from './band'
import { DEFAULT_LOOK, type Look } from './look'
import { OPTIONS, STEPS, SUMMARY, hotkey, openAt, press, preview, previewRows, progress, summary, title, typeHex } from './menu'
import { CLAUDE } from './paint'

const B: BandState = {
  mood: { working: false, since: 0 }, gauges: [{ label: 'ctx', left: 72 }],
  ident: { model: 'Opus 5.5', modes: [] }, themeAccent: CLAUDE, look: DEFAULT_LOOK,
}
const text = (g: { ch: string }[][]) => g.map(r => r.map(c => c.ch).join('')).join('\n')

test('/boneco <parte> opens on that part, accents or not; anything else on the first', () => {
  expect(openAt('chapeu').step).toBe(4)
  expect(openAt(' Chapéu ').step).toBe(4)
  expect(openAt('reações').step).toBe(5)
  expect(openAt('').step).toBe(0)
  expect(openAt('voar').step).toBe(0)
})

test('every part has its options and a key for each, never one of the fixed keys', () => {
  expect(OPTIONS.palette.length).toBe(14)
  expect(OPTIONS.hat.length).toBe(17)
  expect(hotkey(16)).toBe('j')
  expect(hotkey(17)).toBeUndefined()
  for (const st of STEPS) {
    const keys = OPTIONS[st.key].map((_, i) => hotkey(i))
    expect(`${st.key}: ${keys.every(Boolean)} ${keys.some(k => 'tvcrf'.includes(k ?? ''))}`).toBe(`${st.key}: true false`)
  }
})

test('a press saves the option and moves to the next part', () => {
  const r = press(DEFAULT_LOOK, { step: 4 }, 'opt:coroa')
  expect(r.look.hat).toBe('coroa')
  expect(r.state.step).toBe(5)
  expect(title(r.state)).toBe('Mini Claude · 6/6 Reações')
  expect(title({ step: SUMMARY })).toBe('Mini Claude · pronto')
})

test('fixed color and LED open their swatches; a swatch or a typed hex picks and moves on', () => {
  const opened = press(DEFAULT_LOOK, { step: 1 }, 'opt:fixa')
  expect(opened.look.color).toBe('fixa')
  expect(opened.state).toEqual({ step: 1, sub: 'fixa' })
  const sw = press(opened.look, opened.state, 'sw:#6fa8ff')
  expect([sw.look.fixed, sw.state.step]).toEqual(['#6fa8ff', 2])
  const typed = typeHex(opened.look, opened.state, ' A1B2C3 ')
  expect([typed.look.fixed, typed.state.step]).toEqual(['#a1b2c3', 2])
  const bad = typeHex(opened.look, opened.state, 'azul')
  expect(bad.look).toBe(opened.look)
  expect(bad.state.error).toContain('#rrggbb')
  const led = press(DEFAULT_LOOK, { step: 2 }, 'opt:led')
  expect(led.state.sub).toBe('led')
  expect(press(led.look, led.state, 'sw:#ff5d6c').look.led).toBe('#ff5d6c')
})

test('Reações takes many: options turn on and off, Continuar moves on', () => {
  let r = press(DEFAULT_LOOK, { step: 5 }, 'opt:pet')
  r = press(r.look, r.state, 'opt:susto')
  expect(r.look.extras).toEqual(['susto', 'pet'])
  r = press(r.look, r.state, 'opt:pet')
  expect(r.look.extras).toEqual(['susto'])
  expect(r.state.step).toBe(5)
  expect(press(r.look, r.state, 'nav:next').state.step).toBe(SUMMARY)
})

test('toggles, back, restart, close; an unknown key changes nothing', () => {
  expect(press(DEFAULT_LOOK, { step: 1 }, 'tog:duo').look.duo).toBe(true)
  expect(press(DEFAULT_LOOK, { step: 2 }, 'tog:cheeks').look.cheeks).toBe(true)
  expect(press(DEFAULT_LOOK, { step: 3 }, 'nav:back').state.step).toBe(2)
  expect(press(DEFAULT_LOOK, { step: 1, sub: 'fixa' }, 'nav:back').state).toEqual({ step: 1 })
  expect(press(DEFAULT_LOOK, { step: 0 }, 'nav:back').state.step).toBe(0)
  expect(press(DEFAULT_LOOK, { step: SUMMARY }, 'nav:restart').state.step).toBe(0)
  expect(press(DEFAULT_LOOK, { step: SUMMARY }, 'nav:close').close).toBe(true)
  expect(press(DEFAULT_LOOK, { step: 4 }, 'opt:voar').look).toBe(DEFAULT_LOOK)
  expect(press(DEFAULT_LOOK, { step: 4 }, 'sw:#ffffff').look).toBe(DEFAULT_LOOK) // no swatch part open
})

test('the focus previews an option without saving it; off the options, the saved look', () => {
  expect(preview(DEFAULT_LOOK, { step: 4, focused: 'opt:festa' }).hat).toBe('festa')
  expect(DEFAULT_LOOK.hat).toBe('none')
  expect(preview(DEFAULT_LOOK, { step: 4, focused: undefined })).toBe(DEFAULT_LOOK) // the engine's close mark
  expect(preview(DEFAULT_LOOK, { step: 4, focused: 'nav:back' })).toBe(DEFAULT_LOOK)
  expect(preview({ ...DEFAULT_LOOK, extras: ['pet'] }, { step: 5, focused: 'opt:pet' }).extras).toEqual(['pet']) // shown on, not toggled off
  const g = previewRows(B, { step: 4, focused: 'opt:festa' }, 1_001_000, 100)
  expect(g.length).toBe(4)
  expect(text(g)).toContain('Chapéu de festa')
  expect(previewRows(B, { step: 0, focused: 'opt:tokyo' }, 1_001_000, 100).length).toBe(3)
  expect(previewRows(B, { step: SUMMARY }, 1_001_000, 100).length).toBe(3)
})

test('the summary and the progress line', () => {
  const look: Look = { ...DEFAULT_LOOK, palette: 'tokyo', eyes: 'led', cheeks: true, hat: 'coroa', extras: ['pet'] }
  expect(summary(look)).toEqual([
    'Paleta: P5 Tokyo Night',
    'Cor: C1 Da paleta',
    'Olhos: O3 LED #5ee6ff + bochechas',
    'Silhueta: S1 Clássica',
    'Chapéu: H3 Coroa',
    'Reações: X5 Bichinho',
  ])
  expect(progress({ step: 2 })).toBe('✓Paleta ✓Cor ●Olhos ○Silhueta ○Chapéu ○Reações')
})
