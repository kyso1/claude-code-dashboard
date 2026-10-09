// Mini Claude: the welcome screen's mascot, drawn in quadrant pixels (2x2 a
// cell) on a 3-row stage, acting out the spinner's verb. Each of the 189 verbs
// Claude Code samples belongs to one of eight scenes; a verb it learns later
// falls back on the spinner's mode.

import { DEFAULT_LOOK, type Look } from './look'
import { CLASSIC, type Palette } from './palettes'
import { CLAUDE, FAINT, TEXT, fit, lift, text, type Cell, type Paint } from './paint'
import { STAGE_W, blankCanvas, dot, glyph, toCells, type Canvas } from './pixels'
import { BLUSH, bodyColor, carved, face, ghostHem, hatFor, rowsFor, tones, wearHat, type BodyCtx, type Eyes, type Scene } from './wardrobe'

export { STAGE_W } from './pixels'
export type { Scene } from './wardrobe'

export type Mode = 'requesting' | 'responding' | 'thinking' | 'tool-input' | 'tool-use'
export type Mood = { working: boolean; word?: string; message?: string | null; mode?: Mode; since: number; doneAt?: number; durationMs?: number }
export type Tool = { id: string; name: string; detail: string }

export const VERBS: Record<Scene, string> = {
  cook: 'Baking Blanching Brewing Bunning Caramelizing Churning Concocting Cooking Crunching Drizzling Fermenting Flambéing Frosting Garnishing Infusing Julienning Kneading Leavening Marinating Onioning Percolating Proofing Sautéing Seasoning Simmering Smooshing Stewing Tempering Whisking Zesting',
  think: 'Befuddling Bloviating Calculating Cerebrating Cogitating Computing Considering Contemplating Deciphering Deliberating Determining Elucidating Envisioning Flummoxing Hashing Ideating Imagining Inferring Mulling Musing Perusing Philosophizing Pondering Pontificating Processing Puzzling Reticulating Ruminating Thinking',
  build: 'Accomplishing Actioning Actualizing Architecting Bootstrapping Coalescing Combobulating Composing Crafting Creating Crystallizing Doing Doodling Effecting Embellishing Finagling Forging Forming Generating Gitifying Herding Mustering Newspapering Orchestrating Polishing Puttering Recombobulating Sketching Synthesizing Tinkering Working Wrangling',
  dance: "Beboppin' Boogieing Booping Canoodling Choreographing Frolicking Gesticulating Grooving Harmonizing Honking Improvising Jitterbugging Moonwalking Razzle-dazzling Razzmatazzing Shimmying Sock-hopping Vibing",
  walk: 'Boondoggling Burrowing Catapulting Dilly-dallying Fiddle-faddling Flibbertigibbeting Gallivanting Galloping Hullaballooing Kerfuffling Lollygagging Meandering Moseying Noodling Perambulating Pouncing Scampering Schlepping Scurrying Shenaniganing Skedaddling Slithering Spelunking Swooping Tomfoolering Topsy-turvying Waddling Wandering Whatchamacalliting Zigzagging',
  magic: 'Beaming Channeling Clauding Discombobulating Enchanting Hyperspacing Ionizing Levitating Manifesting Metamorphosing Nucleating Orbiting Prestidigitating Quantumizing Sublimating Transfiguring Transmogrifying Transmuting Warping',
  grow: 'Cultivating Germinating Hatching Incubating Nesting Osmosing Photosynthesizing Pollinating Propagating Roosting Sprouting Symbioting Unfurling',
  wind: 'Billowing Cascading Ebbing Flowing Fluttering Gusting Misting Nebulizing Precipitating Spinning Swirling Thundering Twisting Undulating Unraveling Whirlpooling Whirring Wibbling',
}
export const LABELS: Record<Scene, string> = {
  cook: 'cozinhando', think: 'pensando', build: 'construindo', dance: 'dançando',
  walk: 'passeando', magic: 'fazendo mágica', grow: 'cultivando', wind: 'na ventania',
}
const MODE_LABELS: Record<Mode, string> = {
  requesting: 'esperando a API', responding: 'escrevendo a resposta', thinking: 'pensando',
  'tool-input': 'preparando a ferramenta', 'tool-use': 'usando ferramenta',
}
const BY_VERB = new Map(
  (Object.keys(VERBS) as Scene[]).flatMap(s => VERBS[s].split(' ').map(v => [v.toLowerCase(), s] as const)),
)

export function sceneOf(word: string | undefined, mode?: Mode): Scene {
  const key = (word ?? '').replace(/(…|\.\.\.)$/, '').trim().toLowerCase()
  const hit = BY_VERB.get(key)
  if (hit) return hit
  return mode === 'tool-use' || mode === 'tool-input' ? 'build' : mode === 'responding' ? 'dance' : 'think'
}

// --- the mascot ----------------------------------------------------------------

type Arm = 'out' | 'up' | 'down'
type Pose = { eyes: Eyes; armL: Arm; armR: Arm; legs: 0 | 1 | 2 }

// 18x5 pixels, as the welcome screen's  ▐▛███▜▌ / ▝▜█████▛▘ /   ▘▘ ▝▝
// Drawn only on the cell grid (`cell` is a whole column, y always 0): a sprite
// one pixel off it recombines the quadrants into a slanted blob with no eyes.
// So motion is whole-cell steps, arms, legs, eyes and color, never half cells;
// and the eyes only move within their own cell (front <-> up), never sideways.
// What it wears (/boneco) comes with the canvas, drawn by wardrobe.ts.
const ARMS: Record<Arm, number[][]> = { out: [[1, 2], [2, 2]], up: [[2, 1], [1, 0]], down: [[2, 3], [1, 4]] }
const LEGS = [[4, 6, 11, 13], [3, 6, 11, 14], [4, 7, 10, 13]]

function clawd(cv: Canvas, cell: number, pose: Pose, c: Paint) {
  const { look, hat, t } = cv.dress
  cv.cell = cell
  const x0 = cell * 2
  const [top, bot] = tones(look, c)
  const at = (y: number) => (y < 2 ? top : bot)
  const shape = hat && look.shape === 'orelhas' ? 'classica' : look.shape // a hat hides the ears
  for (let y = 0; y < 4; y++) for (let x = 3; x <= 14; x++) if (!carved(shape, x, y)) dot(cv, x0 + x, y, at(y))
  face(cv, x0, shape === 'orelhas' && pose.eyes === 'up' ? 'front' : pose.eyes, look, t) // an eye up would hole an ear
  for (const [x = 0, y = 0] of ARMS[pose.armL]) dot(cv, x0 + x, y, at(y))
  for (const [x = 0, y = 0] of ARMS[pose.armR]) dot(cv, x0 + 17 - x, y, at(y))
  if (shape === 'fantasma') ghostHem(cv, x0, t, bot)
  else for (const x of LEGS[pose.legs] ?? []) dot(cv, x0 + x, 4, bot)
  if (look.cheeks) dot(cv, x0 + 4, 2, BLUSH), dot(cv, x0 + 13, 2, BLUSH)
  if (hat) wearHat(cv, x0, hat, top, t)
}

const beat = (t: number, ms: number) => Math.floor(t / ms)
const blink = (t: number, eyes: Eyes): Eyes => (t % 3700 < 130 ? 'shut' : eyes)
const hash = (n: number) => Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0
const glow = (c: Paint, on: boolean): Paint => (on ? lift(c, 0.1, 0.8) : c)

const STEEL: Paint = [0.55, 0.02, 250]
const STEAM: Paint = [0.88, 0.01, 250]
const FLAME: Paint = [0.7, 0.18, 40]
const FLAME2: Paint = [0.84, 0.16, 85]
const GOLD: Paint = [0.88, 0.15, 95]
const WOOD: Paint = [0.52, 0.08, 60]
const LEAF: Paint = [0.76, 0.17, 145]
const PINK: Paint = [0.76, 0.15, 350]
const WATER: Paint = [0.76, 0.11, 235]
const CLOUD: Paint = [0.82, 0.01, 250]
const BUBBLE: Paint = [0.9, 0.02, 260]

const SCENES: Record<Scene, (cv: Canvas, t: number, c: Paint) => void> = {
  cook(cv, t, c) {
    clawd(cv, 1, { eyes: blink(t, 'front'), armL: 'down', armR: beat(t, 380) % 2 ? 'out' : 'up', legs: 0 }, c)
    for (let x = 21; x <= 24; x++) dot(cv, x, 3, STEEL) // handle
    dot(cv, 25, 3, STEEL)
    dot(cv, 35, 3, STEEL)
    for (let x = 26; x <= 34; x++) dot(cv, x, 4, STEEL)
    for (let x = 27; x <= 33; x += 2) dot(cv, x + (beat(t, 130) % 2), 5, (beat(t, 130) + x) % 3 ? FLAME : FLAME2)
    const hop = Math.round(Math.abs(Math.sin((t / 560) * Math.PI)) * 3)
    dot(cv, 29, 3 - hop, GOLD)
    dot(cv, 30, 3 - hop, GOLD)
    for (const k of [0, 1]) {
      const p = (t / 1100 + k / 2) % 1
      dot(cv, 27 + k * 5 + Math.sin(p * 6.28), 2 - Math.floor(p * 3), STEAM)
    }
  },
  think(cv, t, c) {
    // eyes up, hand to the chin; bubbles rise into a cloud with the thought in it
    clawd(cv, 1, { eyes: blink(t, 'up'), armL: 'out', armR: 'up', legs: 0 }, c)
    const step = beat(t, 380) % 12
    if (step >= 1) dot(cv, 21, 3, BUBBLE)
    if (step >= 2) dot(cv, 23, 2, BUBBLE), dot(cv, 24, 2, BUBBLE)
    if (step >= 3) {
      for (let x = 27; x <= 34; x++) dot(cv, x, 0, BUBBLE), dot(cv, x, 2, BUBBLE)
      for (let x = 26; x <= 35; x++) dot(cv, x, 1, BUBBLE)
      glyph(cv, 15, 0, ['?', '…', '!', '…'][beat(t, 600) % 4] ?? '?', [0.32, 0.04, 260], BUBBLE)
    }
  },
  build(cv, t, c) {
    const down = beat(t, 300) % 2 === 1
    clawd(cv, 1, { eyes: blink(t, 'front'), armL: 'down', armR: down ? 'out' : 'up', legs: 0 }, c)
    for (let x = 24; x <= 31; x++) dot(cv, x, 4, WOOD), dot(cv, x, 5, [0.42, 0.07, 60])
    if (down) {
      for (let x = 19; x <= 22; x++) dot(cv, x, 3, WOOD)
      for (const [x, y] of [[23, 2], [24, 2], [23, 3], [24, 3]] as const) dot(cv, x, y, STEEL)
      if (t % 600 < 220) glyph(cv, 13, 0, '✦', GOLD), glyph(cv, 14, 1, '·', GOLD), glyph(cv, 11, 0, '·', GOLD)
    } else {
      dot(cv, 19, 1, WOOD)
      for (const [x, y] of [[20, 0], [21, 0], [20, 1], [21, 1]] as const) dot(cv, x, y, STEEL)
    }
  },
  dance(cv, t, c) {
    const b = beat(t, 260)
    const left = b % 2 === 0
    clawd(cv, b % 4 < 2 ? 1 : 2, { eyes: blink(t, b % 8 < 6 ? 'front' : 'up'), armL: left ? 'up' : 'out', armR: left ? 'out' : 'up', legs: left ? 1 : 2 }, glow(c, b % 4 === 0))
    for (const k of [0, 1, 2]) {
      const p = (t / 1500 + k / 3) % 1
      glyph(cv, 12 + k * 3 + Math.floor(p * 2), 2 - Math.floor(p * 3), k % 2 ? '♫' : '♪', [0.8, 0.14, (t / 20 + k * 120) % 360])
    }
  },
  walk(cv, t, c) {
    const span = STAGE_W - 9 // cells of road
    const s = beat(t, 300) % (2 * span)
    const right = s < span
    const cell = right ? s : 2 * span - s
    const step = s % 2
    clawd(cv, cell, { eyes: blink(t, 'front'), armL: step ? 'out' : 'down', armR: step ? 'down' : 'out', legs: step ? 1 : 2 }, c)
    glyph(cv, right ? cell - 1 : cell + 9, 2, step ? '·' : ' ', FAINT)
  },
  magic(cv, t, c) {
    clawd(cv, 1, { eyes: blink(t, 'up'), armL: 'up', armR: 'up', legs: 0 }, glow(c, beat(t, 400) % 2 === 0))
    const slot = beat(t, 260)
    for (let k = 0; k < 5; k++) {
      const h = hash(slot * 7 + k)
      const at = 10 + ((h >>> 3) % 12)
      glyph(cv, at, (h >>> 8) % 3, '✦✧⋆·'[(h >>> 12) % 4] ?? '·', [0.84, 0.13, [300, 200, 90][(h >>> 14) % 3] ?? 300])
    }
    if (beat(t, 400) % 2 === 0) glyph(cv, 0, 0, '✧', GOLD)
  },
  grow(cv, t, c) {
    const cycle = (t / 650) % 9
    clawd(cv, 1, { eyes: blink(t, 'front'), armL: 'down', armR: 'out', legs: 0 }, c)
    for (let x = 27; x <= 32; x++) dot(cv, x, 5, WOOD)
    for (let x = 28; x <= 31; x++) dot(cv, x, 4, WOOD)
    const h = Math.min(4, Math.floor(cycle))
    for (let i = 1; i <= h; i++) dot(cv, 29, 4 - i, LEAF)
    if (h >= 2) dot(cv, 28, 2, LEAF)
    if (h >= 3) dot(cv, 30, 1, LEAF)
    if (cycle >= 5) dot(cv, 28, 0, PINK), dot(cv, 30, 0, PINK), dot(cv, 29, 0, GOLD)
    else {
      const p = (t / 420) % 1
      dot(cv, 20 + p * 7, 3 + Math.round(p * p * 2), WATER)
    }
  },
  wind(cv, t, c) {
    const flap = beat(t, 300) % 2
    clawd(cv, beat(t, 900) % 2 ? 2 : 1, { eyes: blink(t, 'front'), armL: flap ? 'up' : 'out', armR: flap ? 'out' : 'up', legs: 0 }, c)
    for (let x = 28; x <= 35; x++) dot(cv, x, 0, CLOUD)
    for (let x = 26; x <= 37; x++) dot(cv, x, 1, CLOUD)
    for (let k = 0; k < 4; k++) dot(cv, 27 + k * 3, 2 + Math.floor(((t / 260 + k * 0.37) % 1) * 4), WATER)
    glyph(cv, 21 - (beat(t, 110) % 10), 2, '~', FAINT)
  },
}

function idle(cv: Canvas, t: number, c: Paint, asleep: boolean) {
  clawd(cv, 1, { eyes: asleep ? 'shut' : blink(t, beat(t, 5200) % 4 === 3 ? 'up' : 'front'), armL: 'out', armR: 'out', legs: 0 }, c)
  if (asleep) {
    const p = (t / 1600) % 1
    glyph(cv, 10 + Math.floor(p * 2), 1 - Math.floor(p * 2), p < 0.5 ? 'z' : 'Z', FAINT)
  }
}

function party(cv: Canvas, t: number, c: Paint) {
  const b = beat(t, 200)
  clawd(cv, 1, { eyes: 'front', armL: b % 2 ? 'up' : 'out', armR: b % 2 ? 'out' : 'up', legs: (b % 2) + 1 as 1 | 2 }, glow(c, b % 2 === 0))
  for (const [cx, cy, d] of [[0, 0, 0], [10, 0, 1], [11, 2, 2], [0, 2, 3]] as const)
    if ((beat(t, 150) + d) % 2) glyph(cv, cx, cy, '✦', GOLD)
}

// What it acts out: the tool in use when there is one, the turn's verb between
// tools. The verb is sampled once a turn, so a long turn would play one scene
// throughout; the tools keep it changing.
const TOOL_SCENES: [RegExp, Scene][] = [
  [/^(Bash|PowerShell|Monitor)$/, 'cook'],
  [/^(Read|NotebookRead)$/, 'think'],
  [/^(Grep|Glob|LS|WebFetch|WebSearch|ToolSearch)$/, 'walk'],
  [/^(Edit|MultiEdit|Write|NotebookEdit)$/, 'build'],
  [/^(Agent|Task|Workflow|Skill|SendMessage)$/, 'magic'],
  [/^(TodoWrite|Task(Create|Update)|Artifact)/, 'grow'],
  [/^mcp__/, 'wind'],
]
export function sceneFor(m: Mood, tool?: Tool): Scene {
  for (const [re, scene] of tool ? TOOL_SCENES : []) if (re.test(tool?.name ?? '')) return scene
  return sceneOf(m.word, m.mode)
}

// A scene holds HOLD_MS before the next takes over, so a burst of quick tools
// does not flicker.
export const HOLD_MS = 1500
export function direct(d: { scene?: Scene; since: number }, want: Scene, now: number): Scene {
  if (d.scene === undefined || (want !== d.scene && now - d.since >= HOLD_MS)) {
    d.scene = want
    d.since = now
  }
  return d.scene
}

// --- what the band draws -------------------------------------------------------

export const DONE_MS = 2500
const SLEEP_MS = 90_000
type Phase = 'work' | 'done' | 'idle' | 'sleep'

export function phaseOf(m: Mood, now: number): Phase {
  if (m.working) return 'work'
  if (m.doneAt !== undefined && now - m.doneAt < DONE_MS) return 'done'
  return now - (m.doneAt ?? m.since) > SLEEP_MS ? 'sleep' : 'idle'
}

// What /boneco picked and what the band knows, for the body color: the palette
// (gauges' ramp, for 'effort'), context left, model and effort as shown.
export type StageOpts = BodyCtx & { look?: Look; palette?: Palette; month?: number }

export function drawStage(m: Mood, t: number, accent: Paint = CLAUDE, scene?: Scene, o: StageOpts = {}): Canvas {
  const look = o.look ?? DEFAULT_LOOK
  const phase = phaseOf(m, t)
  const sc = phase === 'work' ? (scene ?? sceneOf(m.word, m.mode)) : undefined
  const cv = blankCanvas({ look, hat: hatFor(look.hat, sc, o.month ?? new Date(t).getMonth()), t }, rowsFor(look))
  const c = bodyColor(look, accent, o.palette ?? CLASSIC, t, sc, o)
  if (sc) SCENES[sc](cv, t, c)
  else if (phase === 'done') party(cv, t, c)
  else idle(cv, t, c, phase === 'sleep')
  return cv
}

export function stage(m: Mood, t: number, accent: Paint = CLAUDE, scene?: Scene, o: StageOpts = {}): Cell[][] {
  return toCells(drawStage(m, t, accent, scene, o))
}

const STAR = '·✢✳✶✻✽✻✶✳✢'
const secs = (ms: number) => (ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`)

export function caption(m: Mood, tool: Tool | undefined, t: number, width: number, accent: Paint = CLAUDE, scene?: Scene, name?: string): Cell[] {
  const phase = phaseOf(m, t)
  const who = name ? `${name} ` : ''
  if (phase === 'done') return fit(text(name ? `✓ ${name} terminou em ${secs(m.durationMs ?? 0)}` : `✓ feito em ${secs(m.durationMs ?? 0)}`, [0.8, 0.15, 150]), width)
  if (phase === 'sleep') return fit(text(`z  ${who}${name ? 'está ' : ''}dormindo`, FAINT), width)
  if (phase === 'idle') return fit(text(`✻ ${who}${name ? 'está ' : ''}pronto`, FAINT), width)

  const star = STAR[beat(t, 120) % STAR.length] ?? '✻'
  const said = (m.message ?? m.word ?? 'Working').replace(/(…|\.\.\.)$/, '')
  const label = LABELS[scene ?? sceneOf(m.word, m.mode)]
  const mode = m.mode && MODE_LABELS[m.mode] !== label ? `   ${MODE_LABELS[m.mode]}` : '' // not "pensando  pensando"
  const doing = tool ? [...text(`   › ${tool.name} `, TEXT), ...text(tool.detail, FAINT)] : text(mode, FAINT)
  return fit([...text(`${star} ${said}…`, accent), ...text(`  ${name ? `${name} está ${label}` : label}`, FAINT), ...doing], width)
}
