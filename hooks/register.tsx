import type { EngineInterface as Dollar, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import { composeBand } from './band'
import { STAGE_W, direct, react, sceneFor, type Mood, type ReactEvent, type Reaction, type Scene, type Tool } from './clawd'
import type { Gauge } from './gauges'
import { CAVEMAN, PONYTAIL, planOf, prettyModel, type Identity } from './identity'
import { DEFAULT_LOOK, readLook, type Look } from './look'
import {
  MENU_ID, OPTIONS, PREVIEW_KEY, STEPS, SUMMARY, SWATCHES, hotkey, isPicked, openAt, press, previewRows, progress, summary, title, typeHex,
  type MenuState, type Press,
} from './menu'
import { CLAUDE, encode, fromHex, safe, type Paint } from './paint'
import { baseName, homeOf, lastTwo } from './paths'

// The band above the prompt (band.ts): mini Claude on the left; on the right who
// is working (model, effort, folder, branch, cost), what it is doing, and the
// fuel gauges. A mod, not a statusLine command: that redraws at 1 fps at best,
// and the animations need ~30.
const FPS = 30
const KEY = 'dashboard'
const NAME_MAX = 16

export const register: Register = on => {
  let gauges: Gauge[] = []
  let mood: Mood = { working: false, since: Date.now() }
  let tool: Tool | undefined
  let accent: Paint = CLAUDE
  let ident: Identity = { modes: [] }
  let band: { requestId: string; columns: number; rows: number } | null = null
  let name: string | undefined // the mascot's, set with /nome; kept across sessions in $.store
  let look: Look = DEFAULT_LOOK // what /boneco picked; kept across sessions in $.store
  let reaction: Reaction = {} // a failed tool, a permission asked: drawn only if /boneco turned it on
  let menu: MenuState | undefined // /boneco open: which part, what the focus is on
  let pane: { columns: number; rows: number } | null = null // the menu's preview Raster, as last drawn
  const director: { scene?: Scene; since: number } = { since: 0 }
  const feel = (ev: ReactEvent) => {
    reaction = react(reaction, ev, Date.now())
  }

  const measure = (context: SessionContextUsage, limits: SessionRateLimit[], usd?: number) => {
    const limit = (kind: string, label: string): Gauge => {
      const l = limits.find(r => r.kind === kind)
      return { label, left: l ? 100 - l.percentUsed : null, resetsAt: l?.resetsAt ? Date.parse(l.resetsAt) : undefined }
    }
    gauges = [
      { label: 'ctx', left: context.percent === undefined ? null : 100 - context.percent },
      limit('five_hour', '5h'),
      limit('seven_day', '7d'),
    ]
    if (usd !== undefined) ident = { ...ident, usd }
  }

  const bandState = () => ({ mood, tool, scene: director.scene, gauges, ident, themeAccent: accent, look, reaction, name })

  const rows = (now: number, columns: number) => {
    if (!mood.working) director.scene = undefined // the next turn opens on its own scene
    const scene = mood.working ? direct(director, sceneFor(mood, tool), now) : undefined
    return composeBand({ mood, tool, scene, gauges, ident, themeAccent: accent, look, reaction, name }, now, columns)
  }

  on('session.start', async ($, e, next) => {
    const usage = await $.session.usage()
    measure(usage.context, usage.rateLimits, usage.cost?.usd)
    accent = await themeAccent($)
    const stored = await $.store.get('name')
    name = typeof stored === 'string' && stored ? stored : undefined
    look = readLook(await $.store.get('look'))
    await $.command.register({
      name: 'nome',
      description: 'Dá um nome ao mini Claude da faixa (sem nome: mostra o atual; "-": apaga)',
      argumentHint: '<nome>',
    })
    await $.command.register({
      name: 'boneco',
      description: 'Personaliza o mini Claude e as cores da faixa, uma parte por vez',
      argumentHint: '[paleta|cor|olhos|silhueta|chapeu|reacoes]',
    })
    const polled = await readIdentity($)
    ident = { ...ident, ...polled, effort: ident.effort ?? polled.effort }

    $.clock.every(1000 / FPS, async () => {
      const now = Date.now()
      if (band) {
        const grid = rows(now, band.columns)
        if (grid.length !== band.rows) {
          band = null
          $.ui.invalidate('ui.render')
        } else {
          const { deny } = await $.ui.blit({ requestId: band.requestId, key: KEY, cells: encode(grid, band.columns) })
          if (deny) band = null // collapsed or unmounted; the next render brings it back
        }
      }
      if (menu && pane) {
        const grid = previewRows(bandState(), menu, now, pane.columns)
        if (grid.length !== pane.rows) {
          pane = null // a hat came or went: the pane redraws at the new height
          $.ui.invalidate('ui.render')
        } else {
          const { deny } = await $.ui.blit({ requestId: MENU_ID, key: PREVIEW_KEY, cells: encode(grid, pane.columns) })
          if (deny) pane = null
        }
      }
    })
    // ponytail: who and where are polled every 5s, not hooked per way each can change
    $.clock.every(5000, async () => {
      accent = await themeAccent($)
      const polled = await readIdentity($)
      ident = { ...ident, ...polled, effort: ident.effort ?? polled.effort } // a reported effort wins
    })
    return next(e)
  })

  on('session.measure', ($, e, next) => {
    measure(e.context, e.rateLimits, e.cost?.usd)
    return next(e)
  })

  // the live effort, as the status line had it: carried by the turn's hook events
  const effortOf = (e: { agent_id?: string; effort?: { level: string } }) => {
    if (!e.agent_id && e.effort?.level) ident = { ...ident, effort: e.effort.level }
  }
  on('classic.PostToolUse', ($, e, next) => (effortOf(e), feel({ kind: 'settled', agentId: e.agent_id }), next(e)))
  on('classic.Stop', ($, e, next) => (effortOf(e), next(e)))

  // the reactions: a failed tool startles it, a permission asked has it wave until answered
  on('classic.PostToolUseFailure', ($, e, next) => (feel({ kind: 'failure', agentId: e.agent_id, interrupt: e.is_interrupt }), next(e)))
  on('classic.PermissionRequest', ($, e, next) => (feel({ kind: 'permission', agentId: e.agent_id }), next(e)))
  on('classic.PermissionDenied', ($, e, next) => (feel({ kind: 'settled', agentId: e.agent_id }), next(e)))

  // what the mascot acts out: the turn, the spinner's verb and mode, the tool
  on('prompt.submit', ($, e, next) => {
    mood = { working: true, since: Date.now() }
    feel({ kind: 'reset' })
    return next(e)
  })
  on('ui.render', { component: 'Spinner' }, ($, e, next) => {
    mood = { ...mood, working: true, word: e.props.word, message: e.props.message, mode: e.props.mode }
    return next(e)
  })
  on('tool.call', async ($, e, next) => {
    if (e.agentId) return next(e)
    const id = e.tool_use_id
    tool = { id, name: String(e.tool), detail: detail(e as unknown as Record<string, unknown>) }
    try {
      return await next(e)
    } finally {
      if (tool?.id === id) tool = undefined
    }
  })
  on('turn.complete', ($, e, next) => {
    if (!e.agentId) {
      mood = { working: false, since: mood.since, doneAt: Date.now(), durationMs: e.durationMs }
      feel({ kind: 'settled' })
    }
    tool = undefined
    return next(e)
  })

  on('command.run', { command: 'nome' }, async ($, e) => {
    const asked = safe(e.args.trim()).slice(0, NAME_MAX).trim()
    if (!asked) return { text: name ? `O mini Claude se chama ${name}.` : 'O mini Claude ainda não tem nome. Use /nome <nome>.' }
    if (asked === '-') {
      await $.store.delete('name')
      name = undefined
      return { text: 'Nome apagado.' }
    }
    await $.store.set('name', asked)
    name = asked
    return { text: `Agora o mini Claude se chama ${asked}.` }
  })

  // /boneco: the menu, one part at a time; each pick is saved at once
  on('command.run', { command: 'boneco' }, async ($, e) => {
    look = readLook(await $.store.get('look')) // another session may have changed it
    menu = openAt(e.args)
    pane = null
    const opened = await $.ui.open({ id: MENU_ID, title: 'Mini Claude', focus: true, closeOnEscape: true, holdToasts: true, rows: 18 })
    return opened.isPlaced ? {} : { text: `O menu do mini Claude abre quando houver espaço: ${opened.reason}` }
  })

  on('ui.focus', { component: 'Pane', requestId: MENU_ID }, ($, e, next) => {
    if (menu) menu = { ...menu, focused: e.element }
    return next(e)
  })

  on('ui.close', { id: MENU_ID }, ($, e, next) => {
    menu = undefined
    pane = null
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: MENU_ID }, ($, e, next) => {
    if (!menu) return next(e)
    const s = menu
    const step = STEPS[s.step]
    const { Box, Text, Button, Input, Raster } = $.ui.resolve(e)
    const columns = Math.max(STAGE_W + 2, e.props.bodyColumns)
    const grid = previewRows(bandState(), s, Date.now(), columns)
    pane = e.surface === 'terminal' ? { columns, rows: grid.length } : null
    const done = (r: Press) => {
      if (r.look !== look) {
        look = r.look
        void $.store.set('look', look)
      }
      menu = r.close ? undefined : { ...r.state, focused: undefined }
      if (r.close) void $.ui.close({ id: MENU_ID })
      $.ui.invalidate('ui.render')
    }
    const act = (key: string) => () => done(press(look, s, key))
    const options = step && !s.sub ? OPTIONS[step.key] : []
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{title(s)}</Text>
        {pane ? <Raster key={PREVIEW_KEY} columns={columns} rows={grid.length} cells={encode(grid, columns)} /> : null}
        {s.step === SUMMARY ? <Text>{summary(look).join('\n')}</Text> : null}
        {options.length ? (
          <Box flexWrap="wrap" columnGap={2}>
            {options.map((o, i) => (
              <Button key={`opt:${o.value}`} hotkey={hotkey(i)} plain autoFocus={i === 0 || undefined} onPress={act(`opt:${o.value}`)}>
                {`${step && isPicked(look, step.key, o.value) ? '✓ ' : ''}${o.name}`}
              </Button>
            ))}
          </Box>
        ) : null}
        {s.sub ? (
          <Box flexDirection="column">
            <Box flexWrap="wrap" columnGap={2}>
              {SWATCHES[s.sub].map(([hex, label], i) => (
                <Button key={`sw:${hex}`} hotkey={hotkey(i)} plain autoFocus={i === 0 || undefined} onPress={act(`sw:${hex}`)}>
                  <Text color={hex}>■</Text>
                  {` ${label}`}
                </Button>
              ))}
            </Box>
            {s.sub === 'fixa' ? <Input key="hex" label="ou um hex " placeholder="#rrggbb" submitLabel="usar" onSubmit={v => done(typeHex(look, s, v))} /> : null}
            {s.error ? <Text dimColor>{`✗ ${safe(s.error)}`}</Text> : null}
          </Box>
        ) : null}
        {step?.key === 'color' && !s.sub ? (
          <Button key="tog:duo" hotkey="t" plain onPress={act('tog:duo')}>{`Dois tons: ${look.duo ? 'ligado' : 'desligado'}`}</Button>
        ) : null}
        {step?.key === 'eyes' && !s.sub ? (
          <Button key="tog:cheeks" hotkey="t" plain onPress={act('tog:cheeks')}>{`Bochechas: ${look.cheeks ? 'ligadas' : 'desligadas'}`}</Button>
        ) : null}
        <Text dimColor>{progress(s)}</Text>
        <Box columnGap={2}>
          {s.step > 0 || s.sub ? <Button key="nav:back" hotkey="v" plain onPress={act('nav:back')}>← voltar</Button> : null}
          {step?.key === 'extras' ? <Button key="nav:next" hotkey="c" plain onPress={act('nav:next')}>Continuar</Button> : null}
          {s.step === SUMMARY ? <Button key="nav:restart" hotkey="r" plain onPress={act('nav:restart')}>Recomeçar</Button> : null}
          {s.step === SUMMARY ? <Button key="nav:close" hotkey="f" plain autoFocus onPress={act('nav:close')}>Fechar</Button> : null}
          <Text dimColor>setas: prévia · Enter: escolhe · Esc: sai</Text>
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.hasSurvey || !gauges.length) return next(e)
    const { Box, Raster } = $.ui.resolve(e)
    const columns = e.props.bodyColumns
    const grid = rows(Date.now(), columns)
    band = { requestId: e.requestId, columns, rows: grid.length }
    return (
      <Box marginTop={1}>
        <Raster key={KEY} columns={columns} rows={grid.length} cells={encode(grid, columns)} />
      </Box>
    )
  })
}

// Model, folder, branch, plan and modes: cheap reads. Effort only as settings have it;
// the turn's own hook events report the live one.
async function readIdentity($: Dollar): Promise<Omit<Identity, 'usd'>> {
  const cwd = await $.session.cwd()
  const home = await homeDir($)
  const flag = (f: string) => $.fs.read(`${home}/.claude/${f}`).then(s => s.trim() !== '', () => false)
  const [model, branch, caveman, ponytail, plan] = await Promise.all([
    $.session.model(),
    $.process.run(['git', '-C', cwd, 'branch', '--show-current']).then(r => r.stdout.trim(), () => ''),
    flag('.caveman-active'),
    flag('.ponytail-active'),
    $.fs.read(`${home}/.claude.json`).then(s => planOf(JSON.parse(s)), () => undefined),
  ])
  return {
    model: prettyModel(model),
    effort: await settingsEffort($, home, model),
    folder: baseName(cwd),
    branch: branch || undefined,
    plan,
    modes: [...(caveman ? [CAVEMAN] : []), ...(ponytail ? [PONYTAIL] : [])],
  }
}

// The first argument that says what a call is about: a command, a path, a query.
function detail(args: Record<string, unknown>): string {
  for (const k of ['command', 'file_path', 'pattern', 'url', 'query', 'description', 'skill', 'prompt']) {
    const v = args[k]
    if (typeof v !== 'string' || !v.trim()) continue
    const first = v.trim().split('\n')[0] ?? ''
    return k === 'file_path' ? lastTwo(first) : first
  }
  return ''
}

// Effort before the first turn reports it: the model's own setting, then the global one.
async function settingsEffort($: Dollar, home: string, model: string): Promise<string | undefined> {
  try {
    const s = JSON.parse(await $.fs.read(`${home}/.claude/settings.json`))
    return s?.modelSettings?.[model]?.effortLevel ?? s?.effortLevel
  } catch {
    return undefined
  }
}

// The mascot and the model badge wear the theme's `claude` color when the theme
// is a custom one (~/.claude/themes/<slug>.json) that sets it; orange otherwise.
// That is palette P0 ('tema'); the other palettes bring their own (palettes.ts).
async function themeAccent($: Dollar): Promise<Paint> {
  try {
    const theme = (await $.config.list()).find(r => r.key === 'theme')?.value
    if (typeof theme !== 'string' || !theme.startsWith('custom:')) return CLAUDE
    const home = await homeDir($)
    const file = JSON.parse(await $.fs.read(`${home}/.claude/themes/${theme.slice('custom:'.length)}.json`))
    return fromHex(String(file?.overrides?.claude ?? '')) ?? CLAUDE
  } catch {
    return CLAUDE
  }
}

// HOME, or on Windows (where it may be unset) USERPROFILE
async function homeDir($: Dollar): Promise<string> {
  return homeOf(await $.env.get('HOME'), await $.env.get('USERPROFILE'))
}
