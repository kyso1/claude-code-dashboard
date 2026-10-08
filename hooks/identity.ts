// The identity row, moved here from ~/.claude/statusline.sh: model, effort,
// folder, branch, cost and the active modes, in the band's own look (a rounded
// badge in the theme's accent, effort pips on the gauges' ramp).

import { ramp } from './gauges'
import { CAP_L, CAP_R, FAINT, TEXT, text, type Cell, type Paint } from './paint'

export type Identity = { model?: string; effort?: string; folder?: string; branch?: string; usd?: number; plan?: string; modes: string[] }

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
const GAP = '   '
const PLAN: Paint = [0.42, 0.09, 85] // a gold badge
const icon = (code: number) => String.fromCharCode(code) // Nerd Font glyphs, as the old status line drew them
export const BOLT = icon(0xf0e7)
const FOLDER = icon(0xf07b)
const BRANCH = icon(0xe0a0)
export const CAVEMAN = icon(0xf6d5)
export const PONYTAIL = icon(0xf1b0)

// The Pro or Max plan, from ~/.claude.json's oauthAccount (no secrets there):
// on one, the session's cost is what the API would have charged, not a bill.
export function planOf(config: { oauthAccount?: { organizationType?: string; organizationRateLimitTier?: string } }): string | undefined {
  const type = config.oauthAccount?.organizationType
  const tier = /_(\d+x)$/.exec(config.oauthAccount?.organizationRateLimitTier ?? '')?.[1]
  if (type === 'claude_max') return tier ? `Max ${tier}` : 'Max'
  if (type === 'claude_pro') return 'Pro'
  return undefined
}

// "claude-opus-5-5" -> "Opus 5.5"; an alias ("opus") just capitalized
export function prettyModel(id: string): string {
  const m = /claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(id)
  const name = m?.[1] ?? id
  const title = name.charAt(0).toUpperCase() + name.slice(1)
  return m ? `${title} ${m[2]}${m[3] ? `.${m[3]}` : ''}` : title
}

export function identityRow(id: Identity, accent: Paint): Cell[] {
  const [, C, hue] = accent
  const badge: Paint = [0.33, C * 0.45, hue]
  const out: Cell[] = []
  const gap = () => out.length && out.push(...text(GAP, TEXT))

  if (id.model) out.push({ ch: CAP_L, fg: badge }, ...text(`${BOLT} ${id.model}`, [0.9, C * 0.5, hue], badge), { ch: CAP_R, fg: badge })
  if (id.effort) {
    gap()
    const n = EFFORTS.indexOf(id.effort)
    if (n >= 0) for (let i = 0; i < 5; i++) out.push({ ch: i <= n ? '▰' : '▱', fg: i <= n ? ramp(100 - 25 * i) : FAINT })
    out.push(...text(n >= 0 ? ` ${id.effort}` : id.effort, n >= 0 ? ramp(100 - 25 * n) : FAINT))
  }
  if (id.folder) gap(), out.push(...text(`${FOLDER} `, [0.74, 0.11, 300]), ...text(id.folder, TEXT))
  if (id.branch) gap(), out.push(...text(`${BRANCH} `, [0.8, 0.11, 165]), ...text(id.branch, TEXT))
  if (id.usd !== undefined) gap(), out.push(...text(`$${id.usd.toFixed(2)}${id.plan ? ' via API' : ''}`, FAINT))
  if (id.plan) out.push(...text(' ', TEXT), { ch: CAP_L, fg: PLAN }, ...text(id.plan, [0.92, 0.08, 85], PLAN), { ch: CAP_R, fg: PLAN })
  if (id.modes.length) out.push(...text(` ${id.modes.join(' ')}`, FAINT))
  return out
}
