import { expect, test } from 'claude-code/testing'

import { BOLT, CAVEMAN, identityRow, planOf, prettyModel } from './identity'
import { CAP_L, CAP_R, CLAUDE } from './paint'

const str = (row: ReturnType<typeof identityRow>) => row.map(c => c.ch).join('')

test('model ids read as /model shows them', () => {
  expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(prettyModel('claude-sonnet-5-5[1m]')).toBe('Sonnet 5.5')
  expect(prettyModel('opus')).toBe('Opus')
})

test('the old status line row, in the band: badge, effort pips, folder, branch, cost, modes', () => {
  const row = str(identityRow({ model: 'Opus 5.5', effort: 'xhigh', folder: 'meu-app', branch: 'main', usd: 0.574, modes: [CAVEMAN] }, CLAUDE))
  expect(row.startsWith(`${CAP_L}${BOLT} Opus 5.5${CAP_R}   ▰▰▰▰▱ xhigh   `)).toBe(true)
  expect(row).toContain('meu-app')
  expect(row).toContain('main')
  expect(row.endsWith(`$0.57 ${CAVEMAN}`)).toBe(true)
  expect(str(identityRow({ model: 'Opus 5.5', modes: [] }, CLAUDE))).toBe(`${CAP_L}${BOLT} Opus 5.5${CAP_R}`)
})

test('on a subscription the cost is what the API would have charged, next to the plan', () => {
  expect(planOf({ oauthAccount: { organizationType: 'claude_max', organizationRateLimitTier: 'default_claude_max_5x' } })).toBe('Max 5x')
  expect(planOf({ oauthAccount: { organizationType: 'claude_max', organizationRateLimitTier: 'default_claude_max_20x' } })).toBe('Max 20x')
  expect(planOf({ oauthAccount: { organizationType: 'claude_pro' } })).toBe('Pro')
  expect(planOf({ oauthAccount: { organizationType: 'claude_team' } })).toBeUndefined() // not Pro or Max
  expect(planOf({})).toBeUndefined() // an API key: the cost is the real bill
  const row = str(identityRow({ model: 'Opus 5.5', usd: 12.3, plan: 'Max 5x', modes: [] }, CLAUDE))
  expect(row.endsWith(`$12.30 via API ${CAP_L}Max 5x${CAP_R}`)).toBe(true)
  expect(str(identityRow({ usd: 1, modes: [] }, CLAUDE))).toBe('$1.00')
})
