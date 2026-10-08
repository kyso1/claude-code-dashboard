import { expect, test } from 'claude-code/testing'

import { fromHex, rgb, safe } from './paint'

test('a theme hex color survives the trip through OKLCH', () => {
  for (const hex of ['#50b838', '#008858', '#d77757', '#f4f4f5', '#000000']) {
    const back = rgb(fromHex(hex)!)
    const want = parseInt(hex.slice(1), 16)
    for (const shift of [16, 8, 0]) expect(Math.abs(((back >> shift) & 0xff) - ((want >> shift) & 0xff))).toBeLessThanOrEqual(1)
  }
  expect(fromHex('ansi:red')).toBeUndefined()
})

test('only width-1 glyphs reach the Raster', () => {
  expect(safe('npm test → ok ✓ ação')).toBe('npm test → ok ✓ ação')
  expect(safe('deploy 🚀 漢')).toBe('deploy · ·')
})
