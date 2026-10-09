import { expect, mock, test } from 'claude-code/testing'

import { MENU_ID } from './menu'

const PANE = { title: 'Mini Claude', isFocused: true, bodyColumns: 100, placement: 'inline' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} }
const TARGET = { plugin: 'dashboard', surface: 'terminal' as const, component: 'Pane' as const, requestId: MENU_ID, props: PANE }

test('/boneco chapeu: the hat part, a key per option; a press saves and moves on', async ($, on) => {
  mock.store(on)
  on('ui.open', { id: MENU_ID }, () => ({ value: { isPlaced: true } })) // the kit has no surface to seat the pane
  await $.command.run({ command: 'boneco', args: 'chapeu' })
  const ui = await $.ui.mount(TARGET)
  expect(await ui.find({ type: 'Text', text: /5\/6 Chapéu/ })).toBeDefined()
  expect((await ui.find({ key: 'opt:coroa' }))?.props.hotkey).toBe('4') // H0 sem chapéu is 1
  await ui.press({ key: 'opt:coroa' })
  expect(await ui.find({ type: 'Text', text: /6\/6 Reações/ })).toBeDefined()
  expect(await ui.find({ key: 'nav:next' })).toBeDefined()
  await ui.press({ key: 'nav:back' })
  expect((await ui.find({ key: 'opt:coroa' }))?.text).toContain('✓ Coroa')
  await ui.unmount()
})

test('a fixed color: swatches and a field; a typed non-color is refused, a hex picked', async ($, on) => {
  mock.store(on)
  on('ui.open', { id: MENU_ID }, () => ({ value: { isPlaced: true } })) // the kit has no surface to seat the pane
  await $.command.run({ command: 'boneco', args: 'cor' })
  const ui = await $.ui.mount(TARGET)
  await ui.press({ key: 'opt:fixa' })
  expect(await ui.find({ key: 'sw:#6fa8ff' })).toBeDefined()
  await ui.input({ key: 'hex', text: 'azul' })
  expect(await ui.find({ type: 'Text', text: /não é uma cor/ })).toBeDefined()
  await ui.input({ key: 'hex', text: '#a1b2c3' })
  expect(await ui.find({ type: 'Text', text: /3\/6 Olhos/ })).toBeDefined()
  await ui.unmount()
})
