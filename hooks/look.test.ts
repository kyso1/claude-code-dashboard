import { expect, test } from 'claude-code/testing'

import { DEFAULT_LOOK, isHex, readLook } from './look'

test('nothing stored, or garbage: the band as it was before /boneco', () => {
  expect(readLook(undefined)).toEqual(DEFAULT_LOOK)
  expect(readLook(null)).toEqual(DEFAULT_LOOK)
  expect(readLook('lixo')).toEqual(DEFAULT_LOOK)
  expect(readLook([1, 2])).toEqual(DEFAULT_LOOK)
})

test('a bad field falls back alone; the good ones stay', () => {
  const look = readLook({ palette: 'tokyo', color: 'roxo', fixed: '#12345', eyes: 'led', led: '#FF00AA', hat: 'coroa', duo: 'sim', extras: ['pet', 'voar', 'pet', 'susto'], extra: 1 })
  expect(look.palette).toBe('tokyo')
  expect(look.color).toBe(DEFAULT_LOOK.color)
  expect(look.fixed).toBe(DEFAULT_LOOK.fixed)
  expect(look.eyes).toBe('led')
  expect(look.led).toBe('#ff00aa')
  expect(look.hat).toBe('coroa')
  expect(look.duo).toBe(false)
  expect(look.extras).toEqual(['susto', 'pet'])
})

test('a color is #rrggbb and nothing else', () => {
  expect(isHex('#a1b2c3')).toBe(true)
  expect(isHex('#A1B2C3')).toBe(true)
  expect(isHex('a1b2c3')).toBe(false)
  expect(isHex('#abc')).toBe(false)
  expect(isHex('#a1b2c3 ')).toBe(false)
})
