// The identity row, moved here from ~/.claude/statusline.sh: model, effort,
// folder, branch, cost and the active modes, in the band's own look (a rounded
// badge in the accent, effort pips on the palette's ramp).

import { CLASSIC, type Palette } from './palettes'
import { CAP_L, CAP_R, text, type Cell, type Paint } from './paint'

export type Identity = { model?: string; effort?: string; folder?: string; branch?: string; usd?: number; plan?: string; modes: string[] }

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
const GAP = '   '
const PLAN: Paint = [0.42, 0.09, 85] // a gold badge
const PLAN_LIGHT: Paint = [0.87, 0.07, 85]
const icon = (code: number) => String.fromCharCode(code) // Nerd Font glyphs, as the old status line drew them
export const BOLT = icon(0xf0e7)
export const FOLDER = icon(0xf07b)
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

export function identityRow(id: Identity, accent: Paint, pal: Palette = CLASSIC): Cell[] {
  const [, C, hue] = accent
  const badge: Paint = pal.dark ? [0.33, C * 0.45, hue] : [0.88, C * 0.35, hue]
  const ink: Paint = pal.dark ? [0.9, C * 0.5, hue] : [0.32, C * 0.7, hue]
  const out: Cell[] = []
  const gap = () => out.length && out.push(...text(GAP, pal.text))

  if (id.model) out.push({ ch: CAP_L, fg: badge }, ...text(`${BOLT} ${id.model}`, ink, badge), { ch: CAP_R, fg: badge })
  if (id.effort) {
    gap()
    const n = EFFORTS.indexOf(id.effort)
    if (n >= 0) for (let i = 0; i < 5; i++) out.push({ ch: i <= n ? '▰' : '▱', fg: i <= n ? pal.ramp(100 - 25 * i) : pal.faint })
    out.push(...text(n >= 0 ? ` ${id.effort}` : id.effort, n >= 0 ? pal.ramp(100 - 25 * n) : pal.faint))
  }
  if (id.folder) gap(), out.push(...text(`${FOLDER} `, pal.folder), ...text(id.folder, pal.text))
  if (id.branch) gap(), out.push(...text(`${BRANCH} `, pal.branch), ...text(id.branch, pal.text))
  if (id.usd !== undefined) gap(), out.push(...text(`$${id.usd.toFixed(2)}${id.plan ? ' via API' : ''}`, pal.faint))
  if (id.plan) {
    const plan = pal.dark ? PLAN : PLAN_LIGHT
    const planInk: Paint = pal.dark ? [0.92, 0.08, 85] : [0.36, 0.09, 70]
    out.push(...text(' ', pal.text), { ch: CAP_L, fg: plan }, ...text(id.plan, planInk, plan), { ch: CAP_R, fg: plan })
  }
  if (id.modes.length) out.push(...text(` ${id.modes.join(' ')}`, pal.faint))
  return out
}
