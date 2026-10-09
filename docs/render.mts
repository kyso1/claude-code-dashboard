// Renders the dashboard mod's own cell grids (and the subagent script's ANSI
// output) to PNG frames on a canvas, for the README's GIFs and stills.
// Run from the repo root: PLAYWRIGHT_FROM=/path/to/project/package.json npx -y tsx docs/render.mts docs
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { composeBand } from '../hooks/band.ts'
import { DEFAULT_LOOK, EYE_MODES, HAT_KEYS, SHAPES, type Look } from '../hooks/look.ts'
import { OPTIONS } from '../hooks/menu.ts'
import { PALETTES } from '../hooks/palettes.ts'
import { STAGE_W, caption, stage, type Mood, type Scene, type Tool } from '../hooks/clawd.ts'
import { gaugeRow, type Gauge } from '../hooks/gauges.ts'
import { identityRow, type Identity } from '../hooks/identity.ts'
import { CLAUDE, FAINT, TEXT, fit, rgb, text, type Cell, type Paint } from '../hooks/paint.ts'

// Playwright is not a dependency of the mod: point PLAYWRIGHT_FROM at any project that has it
const require = createRequire(process.env.PLAYWRIGHT_FROM ?? import.meta.url)
const { chromium } = require('playwright')

const OUT = process.argv[2] ?? 'out'
mkdirSync(OUT, { recursive: true })

type Css = { ch: string; fg: string; bg?: string }
type Grid = Css[][]
const hex = (p: Paint) => `#${rgb(p).toString(16).padStart(6, '0')}`
const css = (rows: Cell[][]): Grid => rows.map(r => r.map(c => ({ ch: c.ch, fg: hex(c.fg), bg: c.bg && hex(c.bg) })))
const blank = (n: number): Cell[] => Array.from({ length: n }, () => ({ ch: ' ', fg: TEXT }))
const pad = (row: Cell[], n: number) => [...row, ...blank(Math.max(0, n - row.length))].slice(0, n)

// --- the band, composed as register.tsx composes it ---------------------------
const COLS = 118
const NOW = new Date(2026, 9, 8, 18, 0).getTime()
const GAUGES: Gauge[] = [
  { label: 'ctx', left: 72 },
  { label: '5h', left: 46, resetsAt: new Date(2026, 9, 8, 21, 40).getTime() },
  { label: '7d', left: 81, resetsAt: new Date(2026, 9, 14, 11, 0).getTime() },
]
const IDENT: Identity = { model: 'Opus 5.5', effort: 'xhigh', folder: 'meu-app', branch: 'main', usd: 3.47, plan: 'Max 5x', modes: [] }

function band(m: Mood, tool: Tool | undefined, scene: Scene | undefined, t: number, name?: string, gauges = GAUGES): Cell[][] {
  const right = COLS - STAGE_W - 2
  const side = [identityRow(IDENT, CLAUDE), caption(m, tool, t, right, CLAUDE, scene, name), gaugeRow(gauges, NOW, t, right)]
  return stage(m, t, CLAUDE, scene).map((row, i) => pad([...row, ...blank(2), ...fit(side[i] ?? [], right)], COLS))
}

// the prompt box under it, so the band reads in place
function prompt(): Cell[][] {
  const rule: Cell[] = text('─'.repeat(COLS), [0.45, 0.03, 40])
  const raw = (s: string, fg: Paint): Cell[] => [...s].map(ch => ({ ch, fg })) // the engine's own glyphs, past the mod's filter
  return [blank(COLS), rule, pad(raw('❯ ', TEXT), COLS), rule, pad(raw('  ⏵⏵ auto mode on (shift+tab to cycle)', FAINT), COLS)]
}

// --- canvas ----------------------------------------------------------------------
const CW = 10
const CH = 21
const PADX = 22
const PADY = 18
const BG = '#101218'

const PAGE = `<!doctype html><meta charset=utf-8><body style="margin:0;background:${BG}"><canvas id=c></canvas><script>
const CW=${CW}, CH=${CH}, PADX=${PADX}, PADY=${PADY}, BG='${BG}';
const FONT = '16px "Caskaydia Cove", "MesloLGS NF", "Font Awesome 6 Free Solid", "Font Awesome 6 Free", "Fira Code", monospace';
const Q = { '▘':[1,0,0,0],'▝':[0,1,0,0],'▖':[0,0,1,0],'▗':[0,0,0,1],'▀':[1,1,0,0],'▄':[0,0,1,1],'▌':[1,0,1,0],'▐':[0,1,0,1],
  '▚':[1,0,0,1],'▞':[0,1,1,0],'▛':[1,1,1,0],'▜':[1,1,0,1],'▙':[1,0,1,1],'▟':[0,1,1,1],'█':[1,1,1,1] };
const LEFT = { '▏':1,'▎':2,'▍':3,'▋':5,'▊':6,'▉':7 };
const LOW = { '▁':1,'▂':2,'▃':3,'▅':5,'▆':6,'▇':7 };
window.draw = (grid, scale) => {
  const c = document.getElementById('c'), x = c.getContext('2d');
  const cols = Math.max(...grid.map(r => r.length)), rows = grid.length;
  c.width = (cols*CW + 2*PADX)*scale; c.height = (rows*CH + 2*PADY)*scale;
  x.setTransform(scale,0,0,scale,0,0); x.fillStyle = BG; x.fillRect(0,0,c.width,c.height);
  x.textBaseline = 'middle'; x.textAlign = 'center'; x.font = FONT;
  grid.forEach((row, r) => row.forEach((cell, k) => {
    const X = PADX + k*CW, Y = PADY + r*CH, ch = cell.ch;
    if (cell.bg) { x.fillStyle = cell.bg; x.fillRect(X, Y, CW, CH) }
    x.fillStyle = cell.fg; x.strokeStyle = cell.fg;
    if (ch === '█') { x.fillRect(X, Y, CW, CH); return }
    if (Q[ch]) { const q = Q[ch]; const w = Math.round(CW/2), h = Math.round(CH/2);
      if (q[0]) x.fillRect(X, Y, w, h); if (q[1]) x.fillRect(X+w, Y, CW-w, h);
      if (q[2]) x.fillRect(X, Y+h, w, CH-h); if (q[3]) x.fillRect(X+w, Y+h, CW-w, CH-h); return }
    if (LEFT[ch]) { x.fillRect(X, Y, CW*LEFT[ch]/8, CH); return }
    if (LOW[ch]) { const h = CH*LOW[ch]/8; x.fillRect(X, Y+CH-h, CW, h); return }
    if (ch === '\\ue0b6') { x.beginPath(); x.ellipse(X+CW, Y+CH/2, CW, CH/2, 0, Math.PI/2, 3*Math.PI/2); x.fill(); return }
    if (ch === '\\ue0b4') { x.beginPath(); x.ellipse(X, Y+CH/2, CW, CH/2, 0, -Math.PI/2, Math.PI/2); x.fill(); return }
    if (ch === '▰' || ch === '▱') { x.beginPath(); x.moveTo(X+3, Y+6); x.lineTo(X+CW-1, Y+6); x.lineTo(X+CW-3, Y+CH-6); x.lineTo(X+1, Y+CH-6); x.closePath();
      if (ch === '▰') x.fill(); else { x.lineWidth = 1; x.stroke() } return }
    if (ch === '╌') { x.fillRect(X+1, Y+CH/2, 3, 1.4); x.fillRect(X+6, Y+CH/2, 3, 1.4); return }
    if (ch === '─') { x.fillRect(X, Y+CH/2, CW, 1.2); return }
    if (ch !== ' ') x.fillText(ch, X + CW/2, Y + CH/2 + 1);
  }));
  return c.toDataURL('image/png');
};
</script>`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(PAGE)
await page.evaluate(async () => {
  for (const f of ['16px "Caskaydia Cove"', '16px "MesloLGS NF"', '16px "Font Awesome 6 Free Solid"', '16px "Fira Code"']) await document.fonts.load(f)
})

async function png(grid: Grid, file: string, scale = 2) {
  const url: string = await page.evaluate(([g, s]: [Grid, number]) => (window as any).draw(g, s), [grid, scale] as [Grid, number])
  writeFileSync(file, Buffer.from(url.split(',')[1]!, 'base64'))
}

async function gif(frames: Grid[], name: string, fps: number, scale = 1) {
  const dir = join(OUT, `${name}-frames`)
  mkdirSync(dir, { recursive: true })
  for (const [i, g] of frames.entries()) await png(g, join(dir, `${String(i).padStart(4, '0')}.png`), scale)
  const pal = join(dir, 'palette.png')
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(dir, '%04d.png'), '-vf', 'palettegen=stats_mode=diff', pal])
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(dir, '%04d.png'), '-i', pal,
    '-lavfi', 'paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle', '-loop', '0', join(OUT, `${name}.gif`)])
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(dir, '%04d.png'),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', join(OUT, `${name}.mp4`)])
}

// --- 1. hero: one turn, start to finish ---------------------------------------------
const FPS = 15
const T0 = 1_000_000
const NAME = 'Clawd'
const story: { until: number; m: Mood; tool?: Tool; scene?: Scene }[] = [
  { until: 1600, m: { working: false, since: T0 - 5000 } },
  { until: 4400, m: { working: true, since: T0, word: 'Pondering', mode: 'thinking' }, scene: 'think' },
  { until: 7200, m: { working: true, since: T0, word: 'Pondering', mode: 'tool-use' }, tool: { id: 'a', name: 'Bash', detail: 'npm test' }, scene: 'cook' },
  { until: 10000, m: { working: true, since: T0, word: 'Pondering', mode: 'tool-use' }, tool: { id: 'b', name: 'Edit', detail: 'src/checkout.ts' }, scene: 'build' },
  { until: 12400, m: { working: true, since: T0, word: 'Pondering', mode: 'responding' }, scene: 'dance' },
  { until: 14800, m: { working: false, since: T0, doneAt: T0 + 12400, durationMs: 42_000 } },
]
const hero: Grid[] = []
for (let ms = 0; ms < 14800; ms += 1000 / FPS) {
  const s = story.find(x => ms < x.until)!
  hero.push(css([...band(s.m, s.tool, s.scene, T0 + ms, NAME), ...prompt()]))
}
await gif(hero, 'hero', FPS)
await png(hero[Math.round(5.6 * FPS)]!, join(OUT, 'band.png'), 2)

// --- 2. the eight scenes, side by side ------------------------------------------------
const SCENES: [Scene, string, string][] = [
  ['cook', 'Bash', 'Sautéing, Brewing, Baking…'], ['think', 'Read', 'Pondering, Musing, Cogitating…'],
  ['build', 'Edit · Write', 'Forging, Crafting, Tinkering…'], ['walk', 'Grep · Glob · web', 'Meandering, Moseying…'],
  ['magic', 'Agent · Skill', 'Enchanting, Clauding…'], ['dance', 'respondendo', 'Moonwalking, Grooving, Vibing…'],
  ['grow', 'TodoWrite', 'Sprouting, Germinating…'], ['wind', 'MCP', 'Swirling, Gusting, Thundering…'],
]
const LABEL: Record<Scene, string> = { cook: 'cozinhando', think: 'pensando', build: 'construindo', walk: 'passeando', magic: 'fazendo mágica', dance: 'dançando', grow: 'cultivando', wind: 'na ventania' }
const TILE = STAGE_W + 4
const grid: Grid[] = []
for (let ms = 0; ms < 6000; ms += 1000 / FPS) {
  const rows: Cell[][] = []
  for (const half of [0, 1]) {
    const four = SCENES.slice(half * 4, half * 4 + 4)
    const st = four.map(([s]) => stage({ working: true, since: T0, word: '', mode: 'thinking' }, T0 + ms, CLAUDE, s))
    for (let r = 0; r < 3; r++) rows.push(st.flatMap(g => pad(g[r] ?? [], TILE)))
    rows.push(four.flatMap(([s]) => pad(text(LABEL[s], CLAUDE), TILE)))
    rows.push(four.flatMap(([, tool]) => pad(text(tool, TEXT), TILE)))
    rows.push(four.flatMap(([, , verbs]) => pad(text(verbs.length > TILE - 2 ? verbs.slice(0, TILE - 3) + '…' : verbs, FAINT), TILE)))
    if (!half) rows.push(blank(TILE * 4))
  }
  grid.push(css(rows))
}
await gif(grid, 'scenes', FPS)

// --- 3. gauges: the ramp from full to empty, and the glint -------------------------------
const ramp: Grid[] = []
for (let ms = 0; ms < 3200; ms += 1000 / FPS) {
  const g = (left: number, label: string): Gauge => ({ label, left, resetsAt: label === 'ctx' ? undefined : NOW + (label === '5h' ? 2 : 50) * 3600_000 })
  ramp.push(css([
    pad(gaugeRow([g(96, 'ctx'), g(58, '5h'), g(9, '7d')], NOW, ms, 100), 100),
  ]))
}
await gif(ramp, 'gauges', FPS)

// --- 4. subagent rows, from the real jq script --------------------------------------------
const now = Date.now()
const tasks = {
  columns: 112,
  tasks: [
    { id: 'a', agentType: 'Explore', status: 'running', label: 'Lendo src/auth/middleware.ts e vizinhos', startTime: now - 83_000, model: 'claude-sonnet-5-5', effort: 'high', contextWindowSize: 200_000, tokenCount: 45_234, tokenSamples: [1000, 3000, 3500, 9000, 20000, 30000, 38000, 41000, 44000, 45234] },
    { id: 'b', name: 'review:bugs', agentType: 'general-purpose', status: 'completed', label: 'Revisar o diff atrás de bugs', startTime: now - 3_725_000, model: 'claude-opus-5-5', effort: 'xhigh', contextWindowSize: 1_000_000, tokenCount: 312_000, tokenSamples: [312_000] },
    { id: 'c', agentType: 'Plan', status: 'running', label: 'Planejar a migração do checkout', startTime: now - 25_000, model: 'claude-haiku-5-5', effort: 'medium', contextWindowSize: 200_000, tokenCount: 151_000, tokenSamples: [90_000, 110_000, 120_000, 140_000, 151_000] },
  ],
}
const out = execFileSync('bash', [new URL('../extras/subagent-statusline.sh', import.meta.url).pathname], { input: JSON.stringify(tasks), env: { ...process.env, FAKE_NOW: String(now) } }).toString()
const subRows: Grid = out.trim().split('\n').map(l => {
  const content: string = JSON.parse(l).content
  const cells: Css[] = []
  let fg = '#c8cad6'
  for (const part of content.split(/(\u001b\[[0-9;]*m)/)) {
    const m = /^\u001b\[([0-9;]*)m$/.exec(part)
    if (m) {
      const p = m[1]!.split(';').map(Number)
      if (p[0] === 38 && p[1] === 2) fg = `rgb(${p[2]},${p[3]},${p[4]})`
      else if (p[0] === 0) fg = '#c8cad6'
      continue
    }
    for (const ch of part) cells.push({ ch, fg })
  }
  return cells
})
await png(subRows, join(OUT, 'subagents.png'), 2)

// --- 5. looks: what /boneco dresses it in ---------------------------------------------
const LOOK_AT = T0 + 1000 // idle, eyes open, no blink
const TILE_W = 18
const named = (key: 'hat' | 'eyes' | 'shape', value: string) => OPTIONS[key].find(o => o.value === value)?.name ?? value
const tile = (o: Partial<Look>, label: string): Cell[][] => {
  const g = stage({ working: false, since: T0 }, LOOK_AT, CLAUDE, undefined, { look: { ...DEFAULT_LOOK, ...o }, month: 9 })
  const four = g.length === 4 ? g : [[], ...g]
  return [...four.map(r => r.slice(0, 11)), text(label, FAINT)]
}
const shelf = (tiles: Cell[][][]): Cell[][] => [
  ...Array.from({ length: 5 }, (_, r) => tiles.flatMap(t => pad(t[r] ?? [], TILE_W))),
  blank(tiles.length * TILE_W),
]
const looks: Cell[][] = [
  ...shelf(HAT_KEYS.slice(0, 7).map(h => tile({ hat: h }, named('hat', h)))),
  ...shelf(HAT_KEYS.slice(7).map(h => tile({ hat: h }, named('hat', h)))),
  ...shelf(EYE_MODES.map(e => tile({ eyes: e }, named('eyes', e)))),
  ...shelf([...SHAPES.map(s => tile({ shape: s }, named('shape', s))), tile({ cheeks: true, duo: true }, 'Bochechas, 2 tons')]),
]
await png(css(looks), join(OUT, 'looks.png'), 2)

// --- 6. palettes: the band in each one --------------------------------------------------
const palRows: Cell[][] = []
for (const p of PALETTES) {
  const look: Look = { ...DEFAULT_LOOK, palette: p.key }
  const grooving: Mood = { working: true, since: T0, word: 'Grooving', mode: 'responding' }
  palRows.push(text(`${p.name}`, TEXT), ...composeBand({ mood: grooving, scene: 'dance', gauges: GAUGES, ident: IDENT, themeAccent: CLAUDE, look }, T0 + 400, COLS), blank(COLS))
}
await png(css(palRows), join(OUT, 'palettes.png'), 1)

await browser.close()
console.log('ok', OUT)
