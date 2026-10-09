# Personalização do mini Claude e menu `/boneco`: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** paletas, cor, olhos, silhueta, chapéus e reações do mini Claude, escolhidos no menu `/boneco` parte por parte, mais suporte ao Windows nativo.

**Arquitetura:**
- Um objeto `Look` guardado em `$.store` (`look.ts`) diz o que desenhar.
- **Paletas:** `palettes.ts` dá as cores da faixa, e `gauges.ts` e `identity.ts` passam a recebê-las.
- **Mascote:** `clawd.ts` continua dono das cenas, sobre uma grade de pixels extraída para `pixels.ts` (agora com célula de duas cores). As roupas ficam em `wardrobe.ts`.
- **Faixa:** a composição sai do `register.tsx` para `band.ts`, porque a prévia do menu reusa.
- **Menu:** `menu.ts` é a lógica pura. O `register.tsx` desenha o painel e liga os eventos.
- **Windows:** `paths.ts` cobre os caminhos do mod e `extras/subagent-statusline.ps1` é a porta do script de subagents.

**Stack:** mod do Claude Code (plugin de function hooks, TypeScript e TSX rodando no engine, sem Node), testes com `claude-code/testing` (`claude plugin test .`), PowerShell 5.1 e 7, jq.

**Spec:** `docs/superpowers/specs/2026-10-08-personalizacao-boneco-design.md`

## Restrições globais

**Repositório e worktree**
- Repositório: `~/.claude/mods/dashboard`.
- Trabalhe na worktree `~/Documentos/dashboard-boneco` (branch `feat/boneco`), criada na Tarefa 0. A pasta original é vigiada pelas sessões abertas do usuário e recarrega o mod a cada arquivo salvo (armadilha 4 do Segundo Cérebro).

**Ao fim de cada tarefa**
- Rode, na raiz da worktree, `claude plugin validate .` (deve terminar em `✔ Validation passed`) e `claude plugin test .` (deve mostrar `0 fail`).
- **Nunca** rode `tsc -p` na pasta do mod: ele gera `.js` lixo ao lado dos `.ts`.

**Regras do engine**
- Sem Node, sem DOM, só módulos ES, imports sem extensão (`./paint`).
- `$` só pode ser **passado como argumento** para funções declaradas no topo do mesmo arquivo. Closures dentro de hooks podem **capturar** e usar o `$`.
- No `Raster`, só um caractere BMP de largura 1 por célula. Texto vindo de fora passa por `text()` ou `safe()` (`paint.ts`).

**Desenho**
- O sprite só anda em células inteiras: x par e y deslocado só de 2 em 2 pixels.
- Use `>>>` em todo deslocamento de hash.
- `DEFAULT_LOOK` desenha a faixa como hoje. Única exceção aceita: a bancada da cena `construindo` ganha os dois tons de madeira que o código sempre pediu e que o voto de cor apagava.

**Textos e commits**
- Texto que a pessoa lê sai em pt-BR. Comentários de código em inglês, no estilo do arquivo.
- Commits em Conventional Commits, terminando com:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT
  ```
- **Não faça push.**

**`.ps1`**
- Só sintaxe do PowerShell 5.1: sem `??`, sem `?:` e sem `` `e ``.
- UTF-8 forçado na entrada e na saída.
- Filtro `\p{Cc}` nos campos de texto.
- Número formatado com `InvariantCulture`.

## Foco da revisão

Cinco entradas que a spec implica, nenhum teste cobria, e que podem pegar quem usa. Cada uma ganhou um teste na tarefa dona:
1. **Caminho do Windows com barra no fim ou UNC** (`C:\proj\`, `\\srv\share\proj`): o nome da pasta continua sendo `proj` (Tarefa 1).
2. **Contexto desconhecido** (gauge `ctx` com `left: null`) com `suor` ou cor `contexto`: o boneco não sua e não desbota (Tarefa 6).
3. **Foco num elemento do engine** (o X de fechar, `element` ausente): a prévia mostra o `Look` salvo e não quebra (Tarefa 8).
4. **Effort que o mod não conhece** (`ultra`) com cor `effort`: fica no accent (Tarefa 5).
5. **Teclas de atalho:** as das opções nunca colidem com `t`, `v`, `c`, `r`, `f` dos botões fixos em nenhuma parte (Tarefa 8).

---

### Tarefa 0: Worktree

**Arquivos:** nenhum.

- [ ] **Passo 1: criar a worktree e a branch**

```bash
cd ~/.claude/mods/dashboard
git worktree add -b feat/boneco ~/Documentos/dashboard-boneco
cd ~/Documentos/dashboard-boneco
```

- [ ] **Passo 2: linha de base verde**

Rode: `claude plugin validate . && claude plugin test .`
Esperado: `✔ Validation passed` e `22 pass  0 fail`. A primeira execução cria `.claude-plugin/types/`, que é ignorada pelo git.

---

### Tarefa 1: Caminhos e pasta do usuário no Windows

**Arquivos:**
- Criar: `hooks/paths.ts`, `hooks/paths.test.ts`
- Modificar: `hooks/register.tsx` (`readIdentity`, `detail`, `themeAccent`, função nova `homeDir`)

**Interfaces:**
- Produz:
  - `homeOf(home: string | undefined, profile: string | undefined): string`
  - `baseName(p: string): string | undefined`
  - `lastTwo(p: string): string`

- [ ] **Passo 1: teste que falha**: `hooks/paths.test.ts`

```ts
import { expect, test } from 'claude-code/testing'

import { baseName, homeOf, lastTwo } from './paths'

test('Windows paths name their folder and file as POSIX ones do', () => {
  expect(baseName('C:\\Users\\gian\\proj')).toBe('proj')
  expect(baseName('C:\\Users\\gian\\proj\\')).toBe('proj')
  expect(baseName('\\\\srv\\share\\proj')).toBe('proj')
  expect(baseName('/home/kyso/meu-app')).toBe('meu-app')
  expect(baseName('/')).toBeUndefined()
  expect(lastTwo('C:\\a\\b\\c.ts')).toBe('b/c.ts')
  expect(lastTwo('/home/kyso/hooks/clawd.ts')).toBe('hooks/clawd.ts')
})

test('no HOME on Windows: the home folder is USERPROFILE', () => {
  expect(homeOf(undefined, 'C:\\Users\\gian')).toBe('C:\\Users\\gian')
  expect(homeOf('/home/kyso', 'C:\\Users\\gian')).toBe('/home/kyso')
  expect(homeOf('', undefined)).toBe('')
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `claude plugin test .`
Esperado: FAIL em `paths.test.ts` (módulo `./paths` não existe).

- [ ] **Passo 3: implementar**: `hooks/paths.ts`

```ts
// Paths and the home folder on every system the engine runs on: Windows hands
// paths with '\' (a folder may end in one, a share starts with two) and may
// have no HOME, only USERPROFILE.

export const homeOf = (home: string | undefined, profile: string | undefined): string => home || profile || ''

const parts = (p: string) => p.split(/[\\/]/).filter(Boolean)
export const baseName = (p: string): string | undefined => parts(p).at(-1)
export const lastTwo = (p: string): string => parts(p).slice(-2).join('/')
```

- [ ] **Passo 4: usar no `register.tsx`**

Acrescente aos imports: `import { baseName, homeOf, lastTwo } from './paths'`.

Acrescente no fim do arquivo (função de topo, porque recebe `$`):

```ts
// HOME, or on Windows (where it may be unset) USERPROFILE
async function homeDir($: Dollar): Promise<string> {
  return homeOf(await $.env.get('HOME'), await $.env.get('USERPROFILE'))
}
```

Troque estas três linhas:
- em `readIdentity`, `const home = (await $.env.get('HOME')) ?? ''` vira `const home = await homeDir($)`;
- em `readIdentity`, `folder: cwd.split('/').filter(Boolean).at(-1),` vira `folder: baseName(cwd),`;
- em `detail`, `return k === 'file_path' ? first.split('/').slice(-2).join('/') : first` vira `return k === 'file_path' ? lastTwo(first) : first`.

E em `themeAccent`, `const home = await $.env.get('HOME')` vira `const home = await homeDir($)`.

- [ ] **Passo 5: rodar**

Rode: `claude plugin validate . && claude plugin test .`
Esperado: a validação passa, e a linha `env reads` agora lista `HOME, USERPROFILE`. Resultado: 24 pass, 0 fail.

- [ ] **Passo 6: commit**

```bash
git add hooks/paths.ts hooks/paths.test.ts hooks/register.tsx
git commit -m "fix(windows): pasta do usuário via USERPROFILE e caminhos com \\

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

### Tarefa 2: O estado `Look`

**Arquivos:**
- Criar: `hooks/look.ts`, `hooks/look.test.ts`

**Interfaces:**
- Produz: `PALETTE_KEYS`, `COLORS`, `EYE_MODES`, `SHAPES`, `HAT_KEYS`, `HATS`, `EXTRAS` (arrays `as const`); os tipos `PaletteKey`, `HatKey`, `Extra` e `Look`; `DEFAULT_LOOK: Look`; `readLook(raw: unknown): Look`; `isHex(v: string): boolean`.

- [ ] **Passo 1: teste que falha**: `hooks/look.test.ts`

```ts
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
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `claude plugin test .`
Esperado: FAIL (módulo `./look` não existe).

- [ ] **Passo 3: implementar**: `hooks/look.ts`

```ts
// What the person picked for the mini Claude and the band (/boneco), kept in
// $.store under 'look'. Read field by field: the store may hold an older shape
// or garbage, and a bad field falls back on its own default alone.

export const PALETTE_KEYS = ['tema', 'classico', 'chamados', 'catppuccin', 'dracula', 'tokyo', 'nord', 'gruvbox', 'rose', 'synth', 'fosforo', 'ambar', 'acessivel', 'papel'] as const
export const COLORS = ['paleta', 'fixa', 'arco', 'modelo', 'cena', 'contexto', 'effort'] as const
export const EYE_MODES = ['vazados', 'grandes', 'led', 'oculos', 'visor'] as const
export const SHAPES = ['classica', 'orelhas', 'redondo', 'fantasma'] as const
export const HAT_KEYS = ['cartola', 'chef', 'coroa', 'bone', 'festa', 'aureola', 'antenas', 'chifres', 'gato', 'bruxo', 'obra', 'noel', 'palha', 'laco'] as const
export const HATS = ['none', ...HAT_KEYS, 'cena', 'sazonal'] as const
export const EXTRAS = ['susto', 'suor', 'aceno', 'ocio', 'pet'] as const

export type PaletteKey = (typeof PALETTE_KEYS)[number]
export type HatKey = (typeof HAT_KEYS)[number]
export type Extra = (typeof EXTRAS)[number]
export type Look = {
  palette: PaletteKey
  color: (typeof COLORS)[number]
  fixed: string // '#rrggbb', with color 'fixa'
  duo: boolean // dois tons
  eyes: (typeof EYE_MODES)[number]
  led: string // '#rrggbb', with eyes 'led'
  cheeks: boolean
  shape: (typeof SHAPES)[number]
  hat: (typeof HATS)[number]
  extras: Extra[]
}

export const DEFAULT_LOOK: Look = {
  palette: 'tema', color: 'paleta', fixed: '#d77757', duo: false, eyes: 'vazados',
  led: '#5ee6ff', cheeks: false, shape: 'classica', hat: 'none', extras: [],
}

const HEX = /^#[0-9a-f]{6}$/i
export const isHex = (v: string) => HEX.test(v)
const one = <T extends string>(list: readonly T[], v: unknown, d: T): T => ((list as readonly unknown[]).includes(v) ? (v as T) : d)
const hex = (v: unknown, d: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d)
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)

export function readLook(raw: unknown): Look {
  const r = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_LOOK
  const extras = Array.isArray(r.extras) ? (r.extras as unknown[]) : []
  return {
    palette: one(PALETTE_KEYS, r.palette, d.palette),
    color: one(COLORS, r.color, d.color),
    fixed: hex(r.fixed, d.fixed),
    duo: bool(r.duo, d.duo),
    eyes: one(EYE_MODES, r.eyes, d.eyes),
    led: hex(r.led, d.led),
    cheeks: bool(r.cheeks, d.cheeks),
    shape: one(SHAPES, r.shape, d.shape),
    hat: one(HATS, r.hat, d.hat),
    extras: EXTRAS.filter(x => extras.includes(x)), // known ones, once each, in a fixed order
  }
}
```

- [ ] **Passo 4: rodar**

Rode: `claude plugin validate . && claude plugin test .`
Esperado: PASS (27 pass, 0 fail).

- [ ] **Passo 5: commit**

```bash
git add hooks/look.ts hooks/look.test.ts
git commit -m "feat(look): estado da personalização com leitura validada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

### Tarefa 3: Paletas nos medidores e na linha de identidade

**Arquivos:**
- Criar: `hooks/palettes.ts`, `hooks/palettes.test.ts`
- Modificar: `hooks/gauges.ts` (arquivo inteiro abaixo), `hooks/identity.ts` (arquivo inteiro abaixo), `hooks/gauges.test.ts`, `hooks/identity.test.ts` (testes novos no fim)

**Interfaces:**
- Consome: `PaletteKey` (Tarefa 2).
- Produz:
  - o tipo `Palette = { key, name, note, accent: Paint, ramp(left): Paint, text, faint, folder, branch: Paint, dark: boolean }`;
  - `CLASSIC: Palette`, `PALETTES: readonly Palette[]` (na ordem de `PALETTE_KEYS`, P0 = `tema`), `paletteOf(key, themeAccent): Palette`;
  - `classicRamp(left): Paint`, `mix(a, b, k): Paint`;
  - `gaugeRow(gauges, now, t, columns = Infinity, pal = CLASSIC)`;
  - `identityRow(id, accent, pal = CLASSIC)`, `FOLDER` exportado.

- [ ] **Passo 1: testes que falham**: `hooks/palettes.test.ts`

```ts
import { expect, test } from 'claude-code/testing'

import { PALETTE_KEYS } from './look'
import { CLASSIC, PALETTES, classicRamp, paletteOf } from './palettes'
import { CLAUDE, fromHex, rgb } from './paint'

const chan = (c: number) => [c >> 16, (c >> 8) & 0xff, c & 0xff]
const near = (a: number, b: number) => chan(a).every((v, i) => Math.abs(v - (chan(b)[i] ?? 0)) <= 1)

test('one palette per key, in the menu order, P0 first', () => {
  expect(PALETTES.map(p => p.key)).toEqual([...PALETTE_KEYS])
})

test('a ramp runs from its first stop at 100% to its last at 0%', () => {
  const tokyo = PALETTES.find(p => p.key === 'tokyo')!
  expect(near(rgb(tokyo.ramp(100)), rgb(fromHex('#9ece6a')!))).toBe(true)
  expect(near(rgb(tokyo.ramp(0)), rgb(fromHex('#f7768e')!))).toBe(true)
  expect(CLASSIC.ramp).toBe(classicRamp)
})

test('no ramp jumps: neighbouring percents stay close on every palette', () => {
  for (const p of PALETTES) {
    let prev = chan(rgb(p.ramp(100)))
    for (let left = 99; left >= 0; left--) {
      const c = chan(rgb(p.ramp(left)))
      const jump = Math.max(...c.map((v, i) => Math.abs(v - (prev[i] ?? 0))))
      expect(`${p.key}@${left}: ${jump < 16}`).toBe(`${p.key}@${left}: true`)
      prev = c
    }
  }
})

test("'tema' wears the theme's color on the classic palette; the others keep theirs", () => {
  const green = fromHex('#50b838')!
  expect(paletteOf('tema', green).accent).toEqual(green)
  expect(paletteOf('tema', green).ramp).toBe(classicRamp)
  expect(paletteOf('dracula', green).accent).not.toEqual(green)
  expect(paletteOf('tema', CLAUDE).accent).toEqual(CLAUDE)
})
```

No fim de `hooks/gauges.test.ts`, acrescente também `PALETTES` aos imports (`import { PALETTES } from './palettes'`):

```ts
test('a light palette draws light badges and tracks with the same glyphs', () => {
  const papel = PALETTES.find(p => p.key === 'papel')!
  const g = [{ label: 'ctx', left: 50 }]
  const light = gaugeRow(g, NOW, restOf(40), Infinity, papel)
  const dark = gaugeRow(g, NOW, restOf(40))
  expect(light[1]!.bg![0]).toBeGreaterThan(0.8) // the badge behind "CTX"
  expect(dark[1]!.bg![0]).toBeLessThan(0.4)
  expect(str(light)).toBe(str(dark))
})
```

No fim de `hooks/identity.test.ts`, acrescente também `PALETTES` aos imports:

```ts
test('the row takes the palette: its ramp on the pips, the same glyphs', () => {
  const tokyo = PALETTES.find(p => p.key === 'tokyo')!
  const id = { model: 'Opus 5.5', effort: 'low', folder: 'x', modes: [] }
  const row = identityRow(id, tokyo.accent, tokyo)
  expect(row.find(c => c.ch === '▰')!.fg).toEqual(tokyo.ramp(100))
  expect(str(row)).toBe(str(identityRow(id, CLAUDE)))
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `claude plugin test .`
Esperado: FAIL (módulo `./palettes` não existe).

- [ ] **Passo 3: implementar**: `hooks/palettes.ts`

```ts
// The band's palettes (/boneco, part 1): the mascot's and the model badge's
// accent, the ramp the gauges and effort pips run on (100 full -> 0 empty), and
// the text, folder and branch colors. 'tema' is the band as it always was: the
// theme's `claude` color on the classic palette.

import type { PaletteKey } from './look'
import { CLAUDE, FAINT, TEXT, fromHex, type Paint } from './paint'

export type Palette = {
  key: PaletteKey
  name: string
  note: string
  accent: Paint
  ramp: (left: number) => Paint
  text: Paint
  faint: Paint
  folder: Paint
  branch: Paint
  dark: boolean // false: light badges and tracks, for a light terminal
}

const clamp = (v: number) => Math.min(100, Math.max(0, v))

// green at 100% -> red at 0%, as ~/.claude/statusline.sh had it
export function classicRamp(left: number): Paint {
  const i = 4 * (1 - clamp(left) / 100)
  return [0.82 - i * 0.035, 0.15 + i * 0.01, 150 - i * 32]
}

// OKLCH, the hue the short way round
export function mix(a: Paint, b: Paint, k: number): Paint {
  const d = ((((b[2] - a[2]) % 360) + 540) % 360) - 180
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + d * k]
}

const hex = (h: string): Paint => fromHex(h) ?? CLAUDE
function stopsRamp(stops: string[]): (left: number) => Paint {
  const s = stops.map(hex)
  return left => {
    const x = (1 - clamp(left) / 100) * (s.length - 1)
    const i = Math.min(s.length - 2, Math.floor(x))
    return mix(s[i]!, s[i + 1]!, x - i)
  }
}

type Spec = { key: PaletteKey; name: string; note: string; accent: string; stops: string[]; text: string; faint: string; folder: string; branch: string; dark?: false }
const make = (p: Spec): Palette => ({
  key: p.key, name: p.name, note: p.note, accent: hex(p.accent), ramp: stopsRamp(p.stops),
  text: hex(p.text), faint: hex(p.faint), folder: hex(p.folder), branch: hex(p.branch), dark: p.dark ?? true,
})

export const CLASSIC: Palette = {
  key: 'classico', name: 'Clássico', note: 'O laranja do Claude e a rampa verde → vermelho de hoje.',
  accent: CLAUDE, ramp: classicRamp, text: TEXT, faint: FAINT, folder: [0.74, 0.11, 300], branch: [0.8, 0.11, 165], dark: true,
}

export const PALETTES: readonly Palette[] = [
  { ...CLASSIC, key: 'tema', name: 'Do /theme', note: 'O destaque do seu tema do Claude Code sobre o clássico, como a faixa sempre foi.' },
  CLASSIC,
  make({ key: 'chamados', name: 'Chamados', note: 'O seu tema do PortalChamados: lima da marca, status do portal nos medidores.',
    accent: '#50b838', stops: ['#4ade80', '#fbbf24', '#f47920', '#f87171'], text: '#a1a1aa', faint: '#5f5f69', folder: '#a78bfa', branch: '#60a5fa' }),
  make({ key: 'catppuccin', name: 'Catppuccin Mocha', note: 'Pastel sobre azul-ardósia. Mauve no mascote.',
    accent: '#cba6f7', stops: ['#a6e3a1', '#f9e2af', '#fab387', '#f38ba8'], text: '#bac2de', faint: '#6c7086', folder: '#b4befe', branch: '#94e2d5' }),
  make({ key: 'dracula', name: 'Dracula', note: 'Roxo, rosa e ciano em alto contraste.',
    accent: '#bd93f9', stops: ['#50fa7b', '#f1fa8c', '#ffb86c', '#ff5555'], text: '#e2e2dc', faint: '#6272a4', folder: '#ff79c6', branch: '#8be9fd' }),
  make({ key: 'tokyo', name: 'Tokyo Night', note: 'Azul elétrico sobre noite fria.',
    accent: '#7aa2f7', stops: ['#9ece6a', '#e0af68', '#ff9e64', '#f7768e'], text: '#a9b1d6', faint: '#565f89', folder: '#bb9af7', branch: '#73daca' }),
  make({ key: 'nord', name: 'Nord', note: 'Gelo e aurora boreal, tudo mais calmo.',
    accent: '#88c0d0', stops: ['#a3be8c', '#ebcb8b', '#d08770', '#bf616a'], text: '#d8dee9', faint: '#616e88', folder: '#b48ead', branch: '#8fbcbb' }),
  make({ key: 'gruvbox', name: 'Gruvbox', note: 'Retrô quente, cara de terminal dos anos 80.',
    accent: '#fe8019', stops: ['#b8bb26', '#fabd2f', '#fe8019', '#fb4934'], text: '#d5c4a1', faint: '#7c6f64', folder: '#d3869b', branch: '#8ec07c' }),
  make({ key: 'rose', name: 'Rosé Pine', note: 'Rosa suave; a rampa vai de espuma a vinho.',
    accent: '#ebbcba', stops: ['#9ccfd8', '#f6c177', '#ea9a97', '#eb6f92'], text: '#e0def4', faint: '#6e6a86', folder: '#c4a7e7', branch: '#9ccfd8' }),
  make({ key: 'synth', name: 'Synthwave', note: 'Neon rosa e ciano, medidores de menta a vermelho.',
    accent: '#ff7edb', stops: ['#72f1b8', '#36f9f6', '#fede5d', '#fe4450'], text: '#e0d7f5', faint: '#7a6a9a', folder: '#fede5d', branch: '#36f9f6' }),
  make({ key: 'fosforo', name: 'Fósforo', note: 'Monitor CRT verde. Medidores só mudam de brilho.',
    accent: '#5cff8a', stops: ['#8dffaa', '#46d872', '#2a9a4c', '#1d6a35'], text: '#5fd387', faint: '#2f6b45', folder: '#8dffaa', branch: '#8dffaa' }),
  make({ key: 'ambar', name: 'Âmbar', note: 'Terminal âmbar monocromático.',
    accent: '#ffb000', stops: ['#ffcd55', '#e09a00', '#a86f00', '#7a4f00'], text: '#e8a33a', faint: '#7a5a20', folder: '#ffcd55', branch: '#ffcd55' }),
  make({ key: 'acessivel', name: 'Daltonismo', note: 'Rampa azul → laranja, que funciona para quem não distingue verde de vermelho.',
    accent: '#d77757', stops: ['#4ea1ff', '#9fb4d9', '#f2c14e', '#f07b2a'], text: '#c9cbd6', faint: '#6b6f80', folder: '#b39cf0', branch: '#4ea1ff' }),
  make({ key: 'papel', name: 'Papel', note: 'Para terminal de fundo claro: tinta escura, selos claros.', dark: false,
    accent: '#c15f3c', stops: ['#1f9d55', '#a88a06', '#d9730d', '#d0312d'], text: '#3f4250', faint: '#8a8d9a', folder: '#7c4dcc', branch: '#0f8a6a' }),
]

export function paletteOf(key: PaletteKey, themeAccent: Paint): Palette {
  const p = PALETTES.find(p => p.key === key) ?? PALETTES[0]!
  return p.key === 'tema' ? { ...p, accent: themeAccent } : p
}
```

- [ ] **Passo 4: `hooks/gauges.ts` inteiro**

```ts
// The gauge row: ctx, 5h and 7d fuel left. Each gauge is a rounded badge, a
// rounded capsule bar (1/8-cell precision over a dark track of its own hue)
// and its percentage, on the palette's ramp: green at 100% -> red at 0% on the
// classic one, the same stops as the effort pips. A glint sweeps the row,
// foreground and background; under LOW% a gauge breathes.

import { CLASSIC, classicRamp, type Palette } from './palettes'
import { CAP_L, CAP_R, type Cell, type Paint } from './paint'

// tune: glint speed (columns/s), radius (columns), pause between sweeps (ms)
export const SPEED = 80
export const RADIUS = 2.5
export const PAUSE = 1800
const MAX_W = 16 // bar cells, shrunk down to MIN_W in a narrow band
const MIN_W = 6
const GAP = '   '
const LOW = 15 // % left under which a gauge breathes
const BREATH_MS = 1400

export type Gauge = { label: string; left: number | null; resetsAt?: number }
type Base = { ch: string; fg: Paint; bg?: Paint; breathe?: boolean }

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const clamp = (v: number) => Math.min(100, Math.max(0, v))

// fuel left -> its place on the classic ramp; each palette has its own (palettes.ts)
export const ramp = classicRamp

function when(resetsAt: number | undefined, now: number): string {
  if (resetsAt === undefined) return '--'
  const d = new Date(resetsAt)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return d.toDateString() === new Date(now).toDateString() ? hm : `${WEEKDAYS[d.getDay()]} ${hm}`
}

function layout(gauges: Gauge[], now: number, columns: number, pal: Palette): Base[] {
  const tail = (g: Gauge) => (g.label === 'ctx' ? '' : ` ↻ ${when(g.resetsAt, now)}`)
  const fixed =
    gauges.reduce((n, g) => n + g.label.length + 2 + 1 + 2 + 5 + tail(g).length, 0) + GAP.length * (gauges.length - 1)
  const w = Math.max(MIN_W, Math.min(MAX_W, Math.floor((columns - fixed) / gauges.length)))

  const out: Base[] = []
  const put = (s: string, fg: Paint, bg?: Paint, breathe?: boolean) => {
    for (const ch of s) out.push({ ch, fg, bg, breathe })
  }

  gauges.forEach((g, n) => {
    if (n) put(GAP, pal.text)
    const known = g.left !== null
    const left = clamp(g.left ?? 0)
    const [L, C, hue] = pal.ramp(left)
    const tint = known ? C : 0
    const low = known && left < LOW

    const badge: Paint = pal.dark ? [0.33, tint * 0.4, hue] : [0.87, tint * 0.35, hue]
    put(CAP_L, badge, undefined, low)
    put(g.label.toUpperCase(), [pal.dark ? 0.9 : 0.3, (pal.dark ? 0.06 : 0.08) * Math.sign(tint), hue], badge, low)
    put(CAP_R, badge, undefined, low)
    put(' ', pal.text)

    const track: Paint = pal.dark ? [0.26, tint * 0.25, hue] : [0.91, tint * 0.2, hue]
    const exact = (left * w) / 100
    let full = Math.floor(exact)
    let eighth = Math.round((exact - full) * 8)
    if (eighth === 8) (full += 1), (eighth = 0)
    const fill = (i: number): Paint => [L - 0.07 * (1 - i / Math.max(1, w - 1)), C, hue] // darker base, bright head
    put(CAP_L, known && full > 0 ? fill(0) : track)
    for (let i = 0; i < w; i++) {
      if (!known) put('╌', pal.faint, track)
      else if (i < full) put('█', fill(i), track)
      else if (i === full && eighth) put(' ▏▎▍▌▋▊▉'[eighth] ?? ' ', fill(i), track)
      else put(' ', pal.text, track)
    }
    put(CAP_R, known && full >= w ? fill(w - 1) : track)

    put((known ? `${Math.round(left)}%` : '--').padStart(5), known ? [L, C, hue] : pal.faint, undefined, low)
    const t = tail(g)
    if (t) put(t.slice(0, 2), pal.faint), put(t.slice(2), pal.text)
  })
  return out
}

// The row at time t (ms): the glint is a soft bump running left to right, then
// resting for PAUSE; it lifts lightness and washes chroma, background too, so
// it crosses the tracks as a streak.
export function gaugeRow(gauges: Gauge[], now: number, t: number, columns = Infinity, pal: Palette = CLASSIC): Cell[] {
  const cells = layout(gauges, now, columns, pal)
  const period = ((cells.length + 6 * RADIUS) / SPEED) * 1000 + PAUSE
  const pos = ((t % period) / 1000) * SPEED - 3 * RADIUS
  const breath = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / BREATH_MS)
  const lit = ([L, C, h]: Paint, k: number, b: number): Paint => [L + 0.16 * k + b, C * (1 - 0.5 * k), h]

  return cells.map((c, x) => {
    const d = x - pos
    const k = Math.exp((-d * d) / (2 * RADIUS * RADIUS))
    const b = c.breathe ? 0.09 * breath : 0
    return { ch: c.ch, fg: lit(c.fg, k, b), bg: c.bg && lit(c.bg, k, b) }
  })
}
```

- [ ] **Passo 5: `hooks/identity.ts` inteiro**

```ts
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
```

- [ ] **Passo 6: rodar**

Rode: `claude plugin validate . && claude plugin test .`
Esperado: PASS (33 pass, 0 fail). Os testes antigos de gauges e identity passam sem mudança, porque o padrão é `CLASSIC`.

- [ ] **Passo 7: commit**

```bash
git add hooks/palettes.ts hooks/palettes.test.ts hooks/gauges.ts hooks/gauges.test.ts hooks/identity.ts hooks/identity.test.ts
git commit -m "feat(palettes): 14 paletas nos medidores e na linha de identidade

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

### Tarefa 4: Grade de pixels com célula de duas cores

**Arquivos:**
- Criar: `hooks/pixels.ts`, `hooks/pixels.test.ts`
- Modificar: `hooks/clawd.ts` (imports, remover a seção `--- pixels ---`, chamada de `blankCanvas` em `stage`)

**Interfaces:**
- Consome: `Look`, `HatKey`, `DEFAULT_LOOK` (Tarefa 2).
- Produz:
  - `STAGE_W = 22`;
  - os tipos `Dress = { look: Look; hat: HatKey | null; t: number }` e `Canvas = { rows: 3 | 4; oy: 0 | 2; px: (Paint | null)[]; glyphs: Map<number, Cell>; dress: Dress; cell: number }`;
  - `blankCanvas(dress, rows = 3)`, `dot(cv, x, y, p)`, `glyph(cv, cx, cy, ch, fg, bg?)`, `toCells(cv): Cell[][]`, `quad(cv, cx, cy): (Paint | null)[]`.
  - `clawd.ts` continua exportando `STAGE_W`.

- [ ] **Passo 1: teste que falha**: `hooks/pixels.test.ts`

```ts
import { expect, test } from 'claude-code/testing'

import { DEFAULT_LOOK } from './look'
import type { Paint } from './paint'
import { blankCanvas, dot, glyph, toCells } from './pixels'

const A: Paint = [0.7, 0.1, 40]
const B: Paint = [0.3, 0.05, 250]
const fresh = (rows: 3 | 4 = 3) => blankCanvas({ look: DEFAULT_LOOK, hat: null, t: 0 }, rows)
const cell = (cv: ReturnType<typeof fresh>, cx = 0, cy = 0) => toCells(cv)[cy]![cx]!

test('a full cell of two colors draws the fewer as the glyph over the other', () => {
  const cv = fresh()
  dot(cv, 0, 0, A), dot(cv, 1, 0, B), dot(cv, 0, 1, B), dot(cv, 1, 1, B)
  const c = cell(cv)
  expect([c.ch, c.fg, c.bg]).toEqual(['▘', A, B])
})

test('a tie keeps the first color in reading order as the glyph', () => {
  const cv = fresh()
  dot(cv, 0, 0, A), dot(cv, 1, 0, A), dot(cv, 0, 1, B), dot(cv, 1, 1, B)
  const c = cell(cv)
  expect([c.ch, c.fg, c.bg]).toEqual(['▀', A, B])
})

test('two colors and a hole cannot share a cell: the vote wins, no background', () => {
  const cv = fresh()
  dot(cv, 0, 0, A), dot(cv, 1, 0, A), dot(cv, 0, 1, B)
  const c = cell(cv)
  expect([c.ch, c.fg, c.bg]).toEqual(['▛', A, undefined])
})

test('on 4 rows the scene stands a cell lower and a hat fits above it', () => {
  const cv = fresh(4)
  dot(cv, 0, 0, A) // the head's top row
  dot(cv, 0, -2, B) // a hat's top row
  glyph(cv, 3, 0, '!', A)
  const g = toCells(cv)
  expect(g.length).toBe(4)
  expect(g[0]![0]!.ch).toBe('▘')
  expect(g[1]![0]!.ch).toBe('▘')
  expect(g[1]![3]!.ch).toBe('!')
  const flat = fresh(3)
  dot(flat, 0, -1, A) // off the stage without the hat row
  expect(cell(flat).ch).toBe(' ')
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `claude plugin test .`
Esperado: FAIL (módulo `./pixels` não existe).

- [ ] **Passo 3: implementar**: `hooks/pixels.ts`

```ts
// The stage's pixel grid: quadrant pixels, 2x2 a cell, on 3 rows of cells; on
// 4 when the mascot wears a hat, the scene then standing one whole cell lower
// (y -2 and -1 are the hat's). A cell takes one glyph, a foreground color and
// a background color.

import type { HatKey, Look } from './look'
import { TEXT, type Cell, type Paint } from './paint'

export const STAGE_W = 22 // cells
const PW = STAGE_W * 2 // pixels
const QUAD = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█' // index = UL 1 | UR 2 | LL 4 | LR 8

// what the mascot wears in this frame, read by clawd() wherever a scene draws it
export type Dress = { look: Look; hat: HatKey | null; t: number }
export type Canvas = { rows: 3 | 4; oy: 0 | 2; px: (Paint | null)[]; glyphs: Map<number, Cell>; dress: Dress; cell: number }

export function blankCanvas(dress: Dress, rows: 3 | 4 = 3): Canvas {
  return { rows, oy: rows === 4 ? 2 : 0, px: new Array<Paint | null>(PW * rows * 2).fill(null), glyphs: new Map(), dress, cell: 1 }
}

// x, y in scene pixels: y 0 is the head's top row
export function dot(cv: Canvas, x: number, y: number, p: Paint | null) {
  x = Math.round(x)
  y = Math.round(y) + cv.oy
  if (x >= 0 && x < PW && y >= 0 && y < cv.rows * 2) cv.px[y * PW + x] = p
}
export function glyph(cv: Canvas, cx: number, cy: number, ch: string, fg: Paint, bg?: Paint) {
  cy += cv.oy / 2
  if (cx >= 0 && cx < STAGE_W && cy >= 0 && cy < cv.rows) cv.glyphs.set(cy * STAGE_W + cx, { ch, fg, bg })
}

export function quad(cv: Canvas, cx: number, cy: number): (Paint | null)[] {
  const i = 2 * cy * PW + 2 * cx
  return [cv.px[i] ?? null, cv.px[i + 1] ?? null, cv.px[i + PW] ?? null, cv.px[i + PW + 1] ?? null]
}
const bits = (q: (Paint | null)[], hit: (p: Paint | null) => boolean) => q.reduce((n, p, i) => (hit(p) ? n | (1 << i) : n), 0)

// One color a cell, the most-voted, as quadrants have always been drawn; and
// two when all four are filled with exactly two: the fewer (on a tie, the first
// in reading order) is the glyph, the other its background. Two colors and a
// hole, or three colors, cannot be drawn in a cell: those fall back on the
// vote, and no outfit makes one (wardrobe.test.ts).
export function toCells(cv: Canvas): Cell[][] {
  return Array.from({ length: cv.rows }, (_, cy) =>
    Array.from({ length: STAGE_W }, (_, cx): Cell => {
      const g = cv.glyphs.get(cy * STAGE_W + cx)
      if (g) return g
      const q = quad(cv, cx, cy)
      const votes = new Map<Paint, number>()
      for (const p of q) if (p) votes.set(p, (votes.get(p) ?? 0) + 1)
      if (votes.size === 2 && q.every(Boolean)) {
        const [[a], [b]] = [...votes].sort((x, y) => x[1] - y[1]) as [[Paint, number], [Paint, number]] // stable: a tie keeps reading order
        return { ch: QUAD[bits(q, p => p === a)] ?? ' ', fg: a, bg: b }
      }
      const fg = [...votes].sort((x, y) => y[1] - x[1])[0]?.[0] ?? TEXT
      return { ch: QUAD[bits(q, p => p !== null)] ?? ' ', fg }
    }),
  )
}
```

- [ ] **Passo 4: `clawd.ts` passa a usar `pixels.ts`**

Troque o começo do arquivo:

```ts
import { CLAUDE, FAINT, TEXT, fit, lift, text, type Cell, type Paint } from './paint'

export const STAGE_W = 22 // cells
const PW = STAGE_W * 2 // pixels
const PH = 6
```

por:

```ts
import { DEFAULT_LOOK } from './look'
import { CLAUDE, FAINT, TEXT, fit, lift, text, type Cell, type Paint } from './paint'
import { STAGE_W, blankCanvas, dot, glyph, toCells, type Canvas } from './pixels'

export { STAGE_W } from './pixels'
```

Apague a seção inteira que começa em `// --- pixels ----...` e vai até a chave final de `function toCells(cv: Canvas): Cell[][] {...}`: `type Canvas`, `QUAD`, `blankCanvas`, `dot`, `glyph` e `toCells`. Agora tudo isso vem de `pixels.ts`.

Em `export function stage(...)`, troque `const cv = blankCanvas()` por `const cv = blankCanvas({ look: DEFAULT_LOOK, hat: null, t })`.

- [ ] **Passo 5: rodar**

Rode: `claude plugin validate . && claude plugin test .`
Esperado: PASS (37 pass, 0 fail). Os testes de `clawd.test.ts` continuam verdes, inclusive "the mascot never lands between cells".

- [ ] **Passo 6: commit**

```bash
git add hooks/pixels.ts hooks/pixels.test.ts hooks/clawd.ts
git commit -m "refactor(clawd): grade de pixels em pixels.ts, com célula de duas cores

A bancada da cena construindo ganha os dois tons de madeira que o voto de
cor apagava.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

### Tarefa 5: As roupas: cor do corpo, olhos, silhueta e chapéus

**Arquivos:**
- Criar: `hooks/wardrobe.ts`, `hooks/wardrobe.test.ts`
- Modificar: `hooks/clawd.ts` (imports, tipo `Scene`, seção `--- the mascot ---`, `stage`)

**Interfaces:**
- Consome:
  - `Look`, `HatKey`, `DEFAULT_LOOK`, `EYE_MODES`, `SHAPES`, `HATS`, `HAT_KEYS` (Tarefa 2);
  - `Palette`, `CLASSIC`, `PALETTES`, `paletteOf`, `mix` (Tarefa 3);
  - `Canvas`, `dot`, `blankCanvas`, `toCells`, `quad`, `STAGE_W` (Tarefa 4).
- Produz (`wardrobe.ts`):
  - os tipos `Scene`, `Eyes`, `BodyCtx = { ctxLeft?: number; model?: string; effortLevel?: string }`;
  - `bodyColor(look, accent, pal, t, scene, o?)`, `tones(look, c): [Paint, Paint]`, `face(cv, x0, eyes, look, t)`;
  - `carved(shape, x, y)`, `ghostHem(cv, x0, t, p)`, `BLUSH`;
  - `HAT_PIXELS`, `hatFor(hat, scene, month)`, `rowsFor(look): 3 | 4`, `wearHat(cv, x0, hat, body, t)`.
- Produz (`clawd.ts`):
  - o tipo `StageOpts = BodyCtx & { look?: Look; palette?: Palette; month?: number }`;
  - `drawStage(m, t, accent?, scene?, o?): Canvas`, `stage(m, t, accent?, scene?, o?): Cell[][]`;
  - `Scene` reexportado.

- [ ] **Passo 1: teste que falha**: `hooks/wardrobe.test.ts`

```ts
import { expect, test } from 'claude-code/testing'

import { STAGE_W, VERBS, drawStage, stage, type Mood, type Scene } from './clawd'
import { DEFAULT_LOOK, EYE_MODES, HATS, HAT_KEYS, SHAPES, type HatKey, type Look } from './look'
import { PALETTES, paletteOf } from './palettes'
import { CLAUDE, fromHex, type Cell } from './paint'
import { quad } from './pixels'
import { bodyColor, hatFor } from './wardrobe'

const T0 = 1_000_000
const AT = T0 + 1000 // idle, eyes open to the front, no blink, no glint
const idle: Mood = { working: false, since: T0 }
const rows = (g: Cell[][]) => g.map(r => r.map(c => c.ch).join(''))
const look = (o: Partial<Look>): Look => ({ ...DEFAULT_LOOK, ...o })
const at = (o: Partial<Look>) => rows(stage(idle, AT, CLAUDE, undefined, { look: look(o) }))

test('the default look draws the band as before /boneco', () => {
  for (const dt of [0, 500, 1300, 4000])
    expect(rows(stage(idle, T0 + dt, CLAUDE, undefined, { look: DEFAULT_LOOK, palette: paletteOf('tema', CLAUDE) }))).toEqual(rows(stage(idle, T0 + dt)))
})

test('each eye mode draws its own face row', () => {
  const FACES: Record<Look['eyes'], string> = { vazados: '▐▛███▜▌', grandes: '▐▌███▐▌', led: '▐▗███▖▌', oculos: '▐▀███▀▌', visor: '▐▀▀▀▀▀▌' }
  for (const eyes of EYE_MODES) expect(`${eyes}: ${at({ eyes })[0]!.includes(FACES[eyes])}`).toBe(`${eyes}: true`)
  const led = stage(idle, AT, CLAUDE, undefined, { look: look({ eyes: 'led', led: '#ff0000' }) })[0]![2]!
  expect(led.ch).toBe('▗')
  expect(led.fg).toEqual(fromHex('#ff0000')!)
  expect(led.bg).toEqual(CLAUDE)
})

test('the silhouettes carve the body without moving it', () => {
  expect(at({ shape: 'orelhas' })[0]).toContain('▐▛▄▄▄▜▌')
  expect(at({ shape: 'redondo' })[0]).toContain('▗▛███▜▖')
  expect(at({ shape: 'redondo' })[1]).toContain('▝▀█████▀▘')
  expect(at({ shape: 'fantasma' })[2]).toContain('▘▘▘▘▘▘')
  expect(at({ cheeks: true })[1]).toContain('▝▜▘███▝▛▘')
})

test('a hat adds a row above the head, and the face stays whole under it', () => {
  const HAT_ROWS: Record<HatKey, string> = {
    cartola: '▄▀▀▀▄', chef: '▝▀▀▀▘', coroa: '▐▄▀▄▌', bone: '▟███▙▄▖', festa: '▗▀▖', aureola: '▀▀▀', antenas: '▚   ▞',
    chifres: '▝▖   ▗▘', gato: '▙   ▟', bruxo: '▗▄▄▟█▄▖', obra: '▗▟███▙▖', noel: '▄▀▀▀█', palha: '▄▄▀▀▀▄▄', laco: '▐▄▌',
  }
  for (const hat of HAT_KEYS) {
    const g = at({ hat })
    expect(`${hat}: ${g.length} ${g[0]!.includes(HAT_ROWS[hat])} ${g[1]!.includes('▐▛███▜▌')}`).toBe(`${hat}: 4 true true`)
  }
  expect(at({ hat: 'cena' }).length).toBe(4) // keeps its height between scenes
})

test('the automatic hats: by scene, by month, none between scenes', () => {
  expect(hatFor('cena', 'cook', 0)).toBe('chef')
  expect(hatFor('cena', undefined, 0)).toBeNull()
  expect(hatFor('sazonal', undefined, 9)).toBe('bruxo')
  expect(hatFor('sazonal', undefined, 11)).toBe('noel')
  expect(hatFor('sazonal', undefined, 3)).toBeNull()
  expect(hatFor('none', 'cook', 9)).toBeNull()
  expect(hatFor('coroa', undefined, 3)).toBe('coroa')
})

test('body colors: palette, fixed, rainbow, model, scene, context, effort', () => {
  const tokyo = PALETTES.find(p => p.key === 'tokyo')!
  const c = (o: Partial<Look>, scene?: Scene, ctx = {}) => bodyColor(look(o), CLAUDE, tokyo, AT, scene, ctx)
  expect(c({})).toEqual(CLAUDE)
  expect(c({ color: 'fixa', fixed: '#ff0000' })).toEqual(fromHex('#ff0000')!)
  expect(bodyColor(look({ color: 'arco' }), CLAUDE, tokyo, 0, undefined)[2]).not.toBe(bodyColor(look({ color: 'arco' }), CLAUDE, tokyo, 5000, undefined)[2])
  expect(c({ color: 'modelo' }, undefined, { model: 'Sonnet 5.5' })[2]).toBe(250)
  expect(c({ color: 'modelo' }, undefined, { model: 'GPT 9' })).toEqual(CLAUDE)
  expect(c({ color: 'cena' }, 'magic')[2]).toBe(305)
  expect(c({ color: 'cena' })).toEqual(CLAUDE)
  expect(c({ color: 'contexto' }, undefined, { ctxLeft: 80 })).toEqual(CLAUDE)
  expect(c({ color: 'contexto' })).toEqual(CLAUDE) // context unknown: as if full
  expect(c({ color: 'contexto' }, undefined, { ctxLeft: 30 })[1]).toBeLessThan(CLAUDE[1])
  expect(c({ color: 'contexto' }, undefined, { ctxLeft: 5 })[2]).toBeCloseTo(25, 0)
  expect(c({ color: 'effort' }, undefined, { effortLevel: 'max' })).toEqual(tokyo.ramp(0))
  expect(c({ color: 'effort' }, undefined, { effortLevel: 'ultra' })).toEqual(CLAUDE) // an effort it does not know
})

test('no outfit puts two colors and a hole (or three colors) in a cell of the mascot', () => {
  const scenes: [string, Mood, Scene | undefined][] = [
    ...(Object.keys(VERBS) as Scene[]).map((s): [string, Mood, Scene] => [s, { working: true, since: T0, word: VERBS[s].split(' ')[0]!, mode: 'thinking' }, s]),
    ['idle', idle, undefined],
    ['done', { working: false, since: T0, doneAt: T0 + 3000 }, undefined],
    ['sleep', { working: false, since: T0 - 200_000 }, undefined],
  ]
  const bad: string[] = []
  for (const eyes of EYE_MODES) for (const shape of SHAPES) for (const hat of HATS) for (const duo of [false, true]) {
    const lk = look({ eyes, shape, hat, duo, cheeks: duo, led: '#00ffcc' })
    for (const [name, m, scene] of scenes) for (const dt of [0, 130, 260, 520, 1300, 2600]) {
      const cv = drawStage(m, T0 + dt, CLAUDE, scene, { look: lk, month: 9 })
      // the mascot's columns, head (and hat) to waist: cells cell+1 .. cell+7
      for (let cy = 0; cy < cv.rows - 1; cy++) for (let cx = cv.cell + 1; cx <= cv.cell + 7; cx++) {
        if (cv.glyphs.has(cy * STAGE_W + cx)) continue
        const q = quad(cv, cx, cy)
        const colors = new Set(q.filter(Boolean)).size
        if (colors > 2 || (colors === 2 && q.includes(null))) bad.push(`${eyes}/${shape}/${hat}/${duo ? 'duo' : '-'} ${name}@${dt} ${cx},${cy}`)
      }
    }
  }
  expect(bad.slice(0, 5)).toEqual([])
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `claude plugin test .`
Esperado: FAIL (módulo `./wardrobe` não existe, `drawStage` não exportado).

- [ ] **Passo 3: implementar**: `hooks/wardrobe.ts`

```ts
// What the mascot wears (/boneco, parts 2 to 5): body color, eyes, cheeks,
// silhouette and hat, in the quadrant pixels of pixels.ts. Each piece keeps the
// cells it touches to one color with holes, or two colors with none: a third
// state cannot be drawn in one cell (toCells), and wardrobe.test.ts checks
// that no outfit makes one.

import type { HatKey, Look } from './look'
import { mix, type Palette } from './palettes'
import { fromHex, lift, type Paint } from './paint'
import { dot, type Canvas } from './pixels'

export type Scene = 'cook' | 'think' | 'build' | 'dance' | 'walk' | 'magic' | 'grow' | 'wind'
export type Eyes = 'front' | 'up' | 'shut'

// --- body color (part 2) ----------------------------------------------------------

export const MODEL_COLORS: Record<string, Paint> = { Opus: [0.67, 0.13, 40], Sonnet: [0.7, 0.12, 250], Haiku: [0.8, 0.14, 150], Fable: [0.7, 0.15, 315] }
export const SCENE_HUE: Record<Scene, number> = { cook: 45, think: 255, build: 90, walk: 170, magic: 305, dance: 350, grow: 140, wind: 215 }
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
const ALARM: Paint = [0.64, 0.17, 25]

export type BodyCtx = { ctxLeft?: number; model?: string; effortLevel?: string }

// `accent`: the palette's (the theme's, on 'tema'); `model` as the band shows it ("Opus 5.5")
export function bodyColor(look: Look, accent: Paint, pal: Palette, t: number, scene: Scene | undefined, o: BodyCtx = {}): Paint {
  switch (look.color) {
    case 'fixa':
      return fromHex(look.fixed) ?? accent
    case 'arco':
      return [0.75, 0.15, (t / 28) % 360]
    case 'modelo':
      return MODEL_COLORS[(o.model ?? '').split(' ')[0] ?? ''] ?? accent
    case 'cena':
      return scene ? [0.73, 0.14, SCENE_HUE[scene]] : accent
    case 'contexto': {
      const left = o.ctxLeft ?? 100 // unknown: as if full
      const pale = lift(accent, 0.08, 0.3)
      if (left >= 50) return accent
      if (left >= 15) return mix(accent, pale, (50 - left) / 35)
      return mix(pale, ALARM, Math.min(1, (15 - left) / 10))
    }
    case 'effort': {
      const n = EFFORTS.indexOf(o.effortLevel ?? '')
      return n < 0 ? accent : pal.ramp(100 - 25 * n)
    }
    default:
      return accent
  }
}

// dois tons: the head lighter, the base darker; the change falls between cell rows
export const tones = (look: Look, c: Paint): [Paint, Paint] => (look.duo ? [lift(c, 0.07, 0.85), lift(c, -0.05, 1.05)] : [c, c])

// --- eyes and cheeks (part 3) -----------------------------------------------------

export const BLUSH: Paint = [0.76, 0.13, 5]
const SHADE: Paint = [0.2, 0.02, 270]
const GLINT: Paint = [0.9, 0.02, 250]
const VISOR: Paint = [0.24, 0.04, 250]
const SCAN: Paint = [0.86, 0.15, 200]
const EYE_PX: Record<Eyes, number[][]> = { front: [[5, 1], [12, 1]], up: [[5, 0], [12, 0]], shut: [] }

export function face(cv: Canvas, x0: number, eyes: Eyes, look: Look, t: number) {
  switch (look.eyes) {
    case 'vazados':
      for (const [x = 0, y = 0] of EYE_PX[eyes]) dot(cv, x0 + x, y, null)
      return
    case 'grandes': // two pixels tall: looking up changes nothing
      if (eyes !== 'shut') for (const x of [5, 12]) dot(cv, x0 + x, 0, null), dot(cv, x0 + x, 1, null)
      return
    case 'led': {
      const lc = fromHex(look.led) ?? SCAN
      for (const [x = 0, y = 0] of EYE_PX[eyes]) dot(cv, x0 + x, y, lc)
      return
    }
    case 'oculos': {
      const g = t % 3400 // a glint crosses the left lens, then the right
      const left = g < 150 ? GLINT : SHADE
      const right = g >= 150 && g < 300 ? GLINT : SHADE
      for (const x of [4, 5]) dot(cv, x0 + x, 1, left)
      for (const x of [12, 13]) dot(cv, x0 + x, 1, right)
      return
    }
    case 'visor': {
      for (let x = 4; x <= 13; x++) dot(cv, x0 + x, 1, VISOR)
      const k = Math.floor(t / 150) % 8 // the light sweeps cell by cell, there and back
      const at = 4 + 2 * (k < 5 ? k : 8 - k)
      dot(cv, x0 + at, 1, SCAN), dot(cv, x0 + at + 1, 1, SCAN)
    }
  }
}

// --- silhouette (part 4) ------------------------------------------------------------

export function carved(shape: Look['shape'], x: number, y: number): boolean {
  if (shape === 'orelhas') return y === 0 && x >= 6 && x <= 11
  if (shape === 'redondo') return (y === 0 || y === 3) && (x === 3 || x === 14)
  return false
}

// fantasminha: no legs, the bottom row ripples a pixel at a time
export function ghostHem(cv: Canvas, x0: number, t: number, p: Paint) {
  const ph = Math.floor(t / 240) % 2
  for (let x = 3; x <= 14; x++) if ((x + ph) % 2 === 0) dot(cv, x0 + x, 4, p)
}

// --- hats (part 5): two pixel rows above the head, y -2 and -1 ---------------------

const INK: Paint = [0.36, 0.03, 275]
const BAND: Paint = [0.6, 0.19, 25]
const CHEF: Paint = [0.96, 0.005, 250]
const CHEF2: Paint = [0.86, 0.01, 250]
const GOLD: Paint = [0.88, 0.15, 95]
const RUBY: Paint = [0.6, 0.2, 15]
const CAP: Paint = [0.62, 0.15, 255]
const CAP2: Paint = [0.5, 0.13, 255]
const PINK: Paint = [0.76, 0.15, 350]
const DEVIL: Paint = [0.6, 0.2, 27]
const WITCH: Paint = [0.5, 0.16, 305]
const HARD: Paint = [0.84, 0.17, 85]
const SANTA: Paint = [0.58, 0.2, 27]
const STRAW: Paint = [0.83, 0.1, 88]
const STRAW2: Paint = [0.7, 0.1, 78]
const BOW: Paint = [0.74, 0.17, 355]

// [x from, x to, y, color]; 'body' is the head's color, 'halo' a breathing gold
type HatRun = readonly [from: number, to: number, y: -2 | -1, paint: Paint | 'body' | 'halo']
export const HAT_PIXELS: Record<HatKey, readonly HatRun[]> = {
  cartola: [[6, 11, -2, INK], [4, 5, -1, INK], [6, 11, -1, BAND], [12, 13, -1, INK]],
  chef: [[5, 12, -2, CHEF], [6, 11, -1, CHEF2]],
  coroa: [[5, 5, -2, GOLD], [8, 9, -2, RUBY], [12, 12, -2, GOLD], [5, 12, -1, GOLD]],
  bone: [[5, 12, -2, CAP], [4, 13, -1, CAP], [14, 16, -1, CAP2]],
  festa: [[8, 9, -2, GOLD], [7, 10, -1, PINK]],
  aureola: [[6, 11, -2, 'halo']],
  antenas: [[4, 4, -2, 'body'], [5, 5, -1, 'body'], [13, 13, -2, 'body'], [12, 12, -1, 'body']],
  chifres: [[3, 3, -2, DEVIL], [4, 4, -1, DEVIL], [14, 14, -2, DEVIL], [13, 13, -1, DEVIL]],
  gato: [[4, 4, -2, 'body'], [4, 5, -1, 'body'], [13, 13, -2, 'body'], [12, 13, -1, 'body']],
  bruxo: [[9, 11, -2, WITCH], [3, 14, -1, WITCH]],
  obra: [[5, 12, -2, HARD], [3, 14, -1, HARD]],
  noel: [[6, 11, -2, SANTA], [12, 13, -2, CHEF], [4, 13, -1, CHEF]],
  palha: [[6, 11, -2, STRAW], [2, 15, -1, STRAW2]],
  laco: [[11, 11, -2, BOW], [14, 14, -2, BOW], [11, 14, -1, BOW]],
}

const SCENE_HAT: Record<Scene, HatKey> = { cook: 'chef', build: 'obra', magic: 'bruxo', dance: 'festa', walk: 'bone', grow: 'palha', wind: 'noel', think: 'cartola' }
const SEASON_HAT: Partial<Record<number, HatKey>> = { 9: 'bruxo', 11: 'noel', 5: 'palha', 6: 'palha', 0: 'festa' } // by month, 0 = January

export function hatFor(hat: Look['hat'], scene: Scene | undefined, month: number): HatKey | null {
  if (hat === 'none') return null
  if (hat === 'cena') return scene ? SCENE_HAT[scene] : null
  if (hat === 'sazonal') return SEASON_HAT[month] ?? null
  return hat
}

// a hat, even an automatic one between hats, keeps the band at 4 rows: it never jumps
export const rowsFor = (look: Look): 3 | 4 => (look.hat === 'none' ? 3 : 4)

export function wearHat(cv: Canvas, x0: number, hat: HatKey, body: Paint, t: number) {
  const halo = lift(GOLD, 0.05 * Math.sin(t / 300))
  for (const [from, to, y, k] of HAT_PIXELS[hat])
    for (let x = from; x <= to; x++) dot(cv, x0 + x, y, k === 'body' ? body : k === 'halo' ? halo : k)
}
```

- [ ] **Passo 4: `clawd.ts` veste o mascote**

Imports: troque o bloco escrito na Tarefa 4 por:

```ts
import { DEFAULT_LOOK, type Look } from './look'
import { CLASSIC, type Palette } from './palettes'
import { CLAUDE, FAINT, TEXT, fit, lift, text, type Cell, type Paint } from './paint'
import { STAGE_W, blankCanvas, dot, glyph, toCells, type Canvas } from './pixels'
import { BLUSH, bodyColor, carved, face, ghostHem, hatFor, rowsFor, tones, wearHat, type BodyCtx, type Eyes, type Scene } from './wardrobe'

export { STAGE_W } from './pixels'
export type { Scene } from './wardrobe'
```

Apague a linha `export type Scene = 'cook' | 'think' | 'build' | 'dance' | 'walk' | 'magic' | 'grow' | 'wind'`.

Troque o trecho que vai da linha `// --- the mascot ---...` (inclusive) até a chave final de `function clawd(...)`, onde moravam `type Eyes`, `type Arm`, `type Pose`, `EYES`, `ARMS`, `LEGS` e `clawd`, por:

```ts
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
```

Troque `export function stage(...) {...}` (a função inteira) por:

```ts
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
```

- [ ] **Passo 5: rodar**

Rode: `claude plugin validate . && claude plugin test .`
Esperado: PASS (44 pass, 0 fail). O teste das combinações roda cerca de 45 mil quadros e leva uns segundos. Se ele listar células com problema, **corrija o desenho** em `wardrobe.ts` e não o teste. Cada item listado traz olhos, silhueta, chapéu, cena, instante e célula.

- [ ] **Passo 6: commit**

```bash
git add hooks/wardrobe.ts hooks/wardrobe.test.ts hooks/clawd.ts
git commit -m "feat(clawd): cor do corpo, olhos, silhuetas e 14 chapéus

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

### Tarefa 6: Reações e bichinho

**Arquivos:**
- Criar: `hooks/extras.test.ts`
- Modificar: `hooks/clawd.ts` (seção nova `--- reactions and company ---`, `StageOpts`, `drawStage`)

**Interfaces:**
- Consome: `Extra` (Tarefa 2) e o que a Tarefa 5 produz.
- Produz (`clawd.ts`):
  - os tipos `Reaction = { sustoAt?: number; waiting?: boolean }` e `ReactEvent = { kind: 'failure' | 'permission' | 'settled' | 'reset'; agentId?: string; interrupt?: boolean }`;
  - `SUSTO_MS = 1300` e `react(r, ev, now): Reaction`;
  - `StageOpts` ganha `reaction?: Reaction`.

- [ ] **Passo 1: teste que falha**: `hooks/extras.test.ts`

```ts
import { expect, test } from 'claude-code/testing'

import { SUSTO_MS, react, stage, type Mood, type Reaction } from './clawd'
import { DEFAULT_LOOK, type Extra, type Look } from './look'
import { CLAUDE, type Cell } from './paint'

const T0 = 1_000_000
const idle: Mood = { working: false, since: T0 }
const cooking: Mood = { working: true, since: T0, word: 'Sautéing', mode: 'tool-use' }
const wearing = (...extras: Extra[]): Look => ({ ...DEFAULT_LOOK, extras })
const str = (g: Cell[][]) => g.map(r => r.map(c => c.ch).join('')).join('\n')
const frame = (m: Mood, t: number, lk: Look, reaction?: Reaction, ctxLeft?: number) =>
  str(stage(m, t, CLAUDE, m.working ? 'cook' : undefined, { look: lk, reaction, ctxLeft }))

test('a failed tool startles it for a moment, over the scene; then the scene is back', () => {
  const r: Reaction = { sustoAt: T0 + 100 }
  expect(frame(cooking, T0 + 200, wearing('susto'), r)).toContain('!')
  const after = T0 + 100 + SUSTO_MS + 10
  expect(frame(cooking, after, wearing('susto'), r)).toBe(frame(cooking, after, wearing()))
  expect(frame(cooking, T0 + 200, wearing(), r)).toBe(frame(cooking, T0 + 200, wearing())) // off unless picked
})

test('waiting on a permission it waves and asks; a startle wins over the wave', () => {
  const waving = [0, 250, 500, 750].map(dt => frame(idle, T0 + dt, wearing('aceno'), { waiting: true }))
  expect(waving.some(f => f.includes('?'))).toBe(true)
  expect(new Set(waving).size).toBeGreaterThan(1)
  const both = frame(idle, T0 + 150, wearing('aceno', 'susto'), { waiting: true, sustoAt: T0 + 100 })
  expect(both).toContain('!')
  expect(both).not.toContain('?')
})

test('reactions follow the main thread only, and end as the spec says', () => {
  expect(react({}, { kind: 'failure', agentId: 'sub-1' }, T0)).toEqual({})
  expect(react({}, { kind: 'failure' }, T0)).toEqual({ waiting: false, sustoAt: T0 })
  expect(react({ sustoAt: 5 }, { kind: 'failure', interrupt: true }, T0)).toEqual({ waiting: false, sustoAt: 5 }) // Esc is no failure
  expect(react({}, { kind: 'permission' }, T0)).toEqual({ waiting: true })
  expect(react({ waiting: true, sustoAt: 5 }, { kind: 'settled' }, T0)).toEqual({ waiting: false, sustoAt: 5 })
  expect(react({ waiting: true, sustoAt: 5 }, { kind: 'reset' }, T0)).toEqual({})
})

test('low on context it pales and sweats, the drop beside its head; unknown context, no sweat', () => {
  const lk = wearing('suor')
  const frames = [0, 300, 600].map(dt => stage(idle, T0 + dt, CLAUDE, undefined, { look: lk, ctxLeft: 9 }))
  expect(frames.some(g => g[0]![9]!.ch !== ' ')).toBe(true) // cell 9: x 18-19, beside the head
  expect(frames[0]![1]![4]!.fg).not.toEqual(CLAUDE) // a body cell, paler
  expect(str(stage(idle, T0, CLAUDE, undefined, { look: lk, ctxLeft: 40 }))).toBe(str(stage(idle, T0)))
  expect(str(stage(idle, T0, CLAUDE, undefined, { look: lk, ctxLeft: undefined }))).toBe(str(stage(idle, T0)))
})

test('idle, it fidgets: looks around, yawns and stretches, taps a foot', () => {
  const plain = new Set<string>()
  const fidget = new Set<string>()
  for (let dt = 0; dt < 9000; dt += 100) {
    plain.add(frame(idle, T0 + dt, wearing()))
    fidget.add(frame(idle, T0 + dt, wearing('ocio')))
  }
  expect(fidget.size).toBeGreaterThan(plain.size)
  expect([...fidget].some(f => f.includes('o'))).toBe(true)
})

test('the pet sits beside it and trails it on a walk', () => {
  const sitting = stage(idle, T0, CLAUDE, undefined, { look: wearing('pet') })
  expect(sitting[2]!.map(c => c.ch).join('')).toContain('▙▟')
  const walking: Mood = { working: true, since: T0, word: 'Meandering', mode: 'tool-use' }
  const trail = stage(walking, T0, CLAUDE, 'walk', { look: wearing('pet') })
  expect(trail[2]!.map(c => c.ch).join('')).toContain('▙▟')
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `claude plugin test .`
Esperado: FAIL (`SUSTO_MS` e `react` não existem).

- [ ] **Passo 3: implementar em `clawd.ts`**

No import de `./look`, acrescente `type Extra`: `import { DEFAULT_LOOK, type Extra, type Look } from './look'`.

Logo depois de `function party(...) {...}`, acrescente:

```ts
// --- reactions and company (/boneco, part 6) ----------------------------------------

// what just happened to the main thread: a tool failed (when), a permission waits
export type Reaction = { sustoAt?: number; waiting?: boolean }
export type ReactEvent = { kind: 'failure' | 'permission' | 'settled' | 'reset'; agentId?: string; interrupt?: boolean }
export const SUSTO_MS = 1300
const LOW_CTX = 15 // % of context left under which it sweats
const ERR: Paint = [0.7, 0.19, 25]
const PET: Paint = [0.9, 0.03, 80]

export function react(r: Reaction, ev: ReactEvent, now: number): Reaction {
  if (ev.agentId) return r // a subagent's: the band is the main thread's
  switch (ev.kind) {
    case 'failure':
      return { waiting: false, sustoAt: ev.interrupt ? r.sustoAt : now } // Esc is no failure
    case 'permission':
      return { ...r, waiting: true }
    case 'settled':
      return { ...r, waiting: false }
    case 'reset':
      return {}
  }
}

function susto(cv: Canvas, dt: number, c: Paint) {
  const cell = dt < 450 ? 1 + (Math.floor(dt / 70) % 2) : 1 // shakes a whole cell at a time
  clawd(cv, cell, { eyes: 'up', armL: 'up', armR: 'up', legs: 0 }, c)
  glyph(cv, cell + 9, 0, '!', ERR)
}

function aceno(cv: Canvas, t: number, c: Paint) {
  clawd(cv, 1, { eyes: blink(t, 'front'), armL: 'out', armR: beat(t, 200) % 2 ? 'up' : 'out', legs: 0 }, c)
  if (beat(t, 500) % 2) glyph(cv, 10, 0, '?', GOLD)
}

function ocio(cv: Canvas, t: number, c: Paint) {
  const p = t % 9000
  if (p < 2400) clawd(cv, 1, { eyes: beat(t, 600) % 2 ? 'up' : 'front', armL: 'out', armR: 'out', legs: 0 }, c) // looks around
  else if (p < 3800) {
    clawd(cv, 1, { eyes: 'shut', armL: 'up', armR: 'up', legs: 0 }, c) // yawns and stretches
    glyph(cv, 11, 0, 'o', FAINT)
  } else if (p < 6000) clawd(cv, 1, { eyes: blink(t, 'front'), armL: 'out', armR: 'down', legs: beat(t, 220) % 2 ? 1 : 0 }, c) // taps a foot
  else idle(cv, t, c, false)
}

function sweat(cv: Canvas, t: number) {
  const p = (t / 900) % 1
  dot(cv, cv.cell * 2 + 16, Math.floor(p * 3), WATER)
}

// a two-cell companion, wagging its tail: beside the mascot, or behind it on a walk
function pet(cv: Canvas, t: number, cell: number, tailLeft: boolean) {
  const x0 = cell * 2
  for (const [x, y] of [[0, 4], [0, 5], [1, 5], [2, 5], [3, 5], [3, 4]] as const) dot(cv, x0 + x, y, PET)
  dot(cv, tailLeft ? x0 - 1 : x0 + 4, beat(t, 250) % 2 ? 4 : 5, PET)
}
function petFor(cv: Canvas, t: number, scene: Scene | undefined) {
  if (scene !== 'walk') return pet(cv, t, cv.cell + 10, false)
  const span = STAGE_W - 9
  const right = beat(t, 300) % (2 * span) < span
  pet(cv, t, right ? cv.cell - 4 : cv.cell + 10, right)
}
```

Troque `StageOpts` e `drawStage` (da Tarefa 5) por:

```ts
// What /boneco picked and what the band knows, for the body color: the palette
// (gauges' ramp, for 'effort'), context left, model and effort as shown; and
// what just happened (a failed tool, a permission waiting).
export type StageOpts = BodyCtx & { look?: Look; palette?: Palette; month?: number; reaction?: Reaction }

export function drawStage(m: Mood, t: number, accent: Paint = CLAUDE, scene?: Scene, o: StageOpts = {}): Canvas {
  const look = o.look ?? DEFAULT_LOOK
  const on = (x: Extra) => look.extras.includes(x)
  const phase = phaseOf(m, t)
  const sc = phase === 'work' ? (scene ?? sceneOf(m.word, m.mode)) : undefined
  const cv = blankCanvas({ look, hat: hatFor(look.hat, sc, o.month ?? new Date(t).getMonth()), t }, rowsFor(look))
  const sweating = on('suor') && (o.ctxLeft ?? 100) < LOW_CTX
  const body = bodyColor(look, accent, o.palette ?? CLASSIC, t, sc, o)
  const c = sweating ? lift(body, 0.03, 0.55) : body
  const dt = o.reaction?.sustoAt === undefined ? -1 : t - o.reaction.sustoAt // since the tool failed
  const startled = on('susto') && dt >= 0 && dt < SUSTO_MS
  const waving = !startled && on('aceno') && !!o.reaction?.waiting
  if (startled) susto(cv, dt, c)
  else if (waving) aceno(cv, t, c)
  else if (sc) SCENES[sc](cv, t, c)
  else if (phase === 'done') party(cv, t, c)
  else if (phase === 'idle' && on('ocio')) ocio(cv, t, c)
  else idle(cv, t, c, phase === 'sleep')
  if (sweating) sweat(cv, t)
  if (on('pet')) petFor(cv, t, startled || waving ? undefined : sc)
  return cv
}
```

- [ ] **Passo 4: rodar**

Rode: `claude plugin validate . && claude plugin test .`
Esperado: PASS (50 pass, 0 fail).

- [ ] **Passo 5: commit**

```bash
git add hooks/clawd.ts hooks/extras.test.ts
git commit -m "feat(clawd): reações (susto, aceno, suor, ócio) e bichinho

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

### Tarefa 7: A faixa usa o `Look`

**Arquivos:**
- Criar: `hooks/band.ts`, `hooks/band.test.ts`
- Modificar: `hooks/register.tsx` (arquivo inteiro abaixo)

**Interfaces:**
- Consome: `stage`, `caption`, `STAGE_W`, `react`, `Reaction`, `ReactEvent`, `Mood`, `Scene`, `Tool` (`clawd.ts`); `gaugeRow`, `Gauge`; `identityRow`, `Identity`; `paletteOf`; `bodyColor`; `readLook`, `DEFAULT_LOOK`.
- Produz:
  - o tipo `BandState = { mood; tool?; scene?; gauges; ident; themeAccent: Paint; look: Look; reaction?: Reaction; name?: string }`;
  - `MIN_RIGHT = 60` e `composeBand(b, now, columns): Cell[][]`.

- [ ] **Passo 1: teste que falha**: `hooks/band.test.ts`

```ts
import { expect, test } from 'claude-code/testing'

import { MIN_RIGHT, composeBand, type BandState } from './band'
import { STAGE_W } from './clawd'
import { DEFAULT_LOOK } from './look'
import { CLAUDE, type Cell } from './paint'

const T0 = 1_000_000
const base: BandState = {
  mood: { working: false, since: T0 }, gauges: [{ label: 'ctx', left: 72 }],
  ident: { model: 'Opus 5.5', effort: 'high', modes: [] }, themeAccent: CLAUDE, look: DEFAULT_LOOK,
}
const row = (g: Cell[][], i: number) => g[i]!.map(c => c.ch).join('')
const hat = { ...base, look: { ...DEFAULT_LOOK, hat: 'coroa' as const } }

test('three rows as before; with a hat four, the text beside the last three', () => {
  const three = composeBand(base, T0 + 1000, 120)
  expect(three.length).toBe(3)
  expect(row(three, 0)).toContain('Opus 5.5')
  const four = composeBand(hat, T0 + 1000, 120)
  expect(four.length).toBe(4)
  expect(row(four, 0)).toContain('▐▄▀▄▌')
  expect(row(four, 0).length).toBe(STAGE_W + 2)
  expect(row(four, 1)).toContain('Opus 5.5')
  expect(row(four, 3)).toContain('CTX')
})

test('narrow: the stage drops and the text keeps three rows, hat or not', () => {
  const g = composeBand(hat, T0 + 1000, STAGE_W + 2 + MIN_RIGHT - 1)
  expect(g.length).toBe(3)
  expect(row(g, 0)).toContain('Opus 5.5')
})

test('the palette reaches the pips and the gauges, with the same glyphs', () => {
  const tokyo = composeBand({ ...base, look: { ...DEFAULT_LOOK, palette: 'tokyo' } }, T0 + 1000, 120)
  const classic = composeBand(base, T0 + 1000, 120)
  expect(tokyo.map((_, i) => row(tokyo, i))).toEqual(classic.map((_, i) => row(classic, i)))
  const pip = (g: Cell[][]) => g[0]!.find(c => c.ch === '▰')!.fg
  expect(pip(tokyo)).not.toEqual(pip(classic))
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `claude plugin test .`
Esperado: FAIL (módulo `./band` não existe).

- [ ] **Passo 3: implementar**: `hooks/band.ts`

```ts
// The band's rows, as register.tsx draws them and the /boneco preview shows a
// palette: the stage on the left (3 rows, 4 with a hat) and, beside its last
// three, who is working, what it is doing and the fuel gauges.

import { STAGE_W, caption, stage, type Mood, type Reaction, type Scene, type Tool } from './clawd'
import { gaugeRow, type Gauge } from './gauges'
import { identityRow, type Identity } from './identity'
import type { Look } from './look'
import { paletteOf } from './palettes'
import { CLAUDE, fit, type Cell, type Paint } from './paint'
import { bodyColor } from './wardrobe'

export type BandState = {
  mood: Mood
  tool?: Tool
  scene?: Scene
  gauges: Gauge[]
  ident: Identity
  themeAccent: Paint
  look: Look
  reaction?: Reaction
  name?: string
}

const GAP: Cell[] = [{ ch: ' ', fg: CLAUDE }, { ch: ' ', fg: CLAUDE }]
export const MIN_RIGHT = 60 // narrower than this beside the stage: drop the stage

export function composeBand(b: BandState, now: number, columns: number): Cell[][] {
  const pal = paletteOf(b.look.palette, b.themeAccent)
  const o = {
    look: b.look, palette: pal, reaction: b.reaction, model: b.ident.model, effortLevel: b.ident.effort,
    ctxLeft: b.gauges.find(g => g.label === 'ctx')?.left ?? undefined,
  }
  const body = bodyColor(b.look, pal.accent, pal, now, b.mood.working ? b.scene : undefined, o)
  const side = (w: number) => [
    identityRow(b.ident, pal.accent, pal),
    caption(b.mood, b.tool, now, w, body, b.scene, b.name),
    gaugeRow(b.gauges, now, now, w, pal),
  ]
  const right = columns - STAGE_W - GAP.length
  if (right < MIN_RIGHT) return side(columns).map(row => fit(row, columns))
  const rhs = side(right)
  const st = stage(b.mood, now, pal.accent, b.scene, o)
  const off = st.length - 3
  return st.map((row, i) => [...row, ...GAP, ...fit(rhs[i - off] ?? [], right)])
}
```

- [ ] **Passo 4: `hooks/register.tsx` inteiro** (já com as mudanças da Tarefa 1)

```tsx
import type { EngineInterface as Dollar, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import { composeBand } from './band'
import { direct, react, sceneFor, type Mood, type ReactEvent, type Reaction, type Scene, type Tool } from './clawd'
import type { Gauge } from './gauges'
import { CAVEMAN, PONYTAIL, planOf, prettyModel, type Identity } from './identity'
import { DEFAULT_LOOK, readLook, type Look } from './look'
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
    const polled = await readIdentity($)
    ident = { ...ident, ...polled, effort: ident.effort ?? polled.effort }

    $.clock.every(1000 / FPS, async () => {
      if (!band) return
      const now = Date.now()
      const grid = rows(now, band.columns)
      if (grid.length !== band.rows) {
        band = null
        $.ui.invalidate('ui.render')
        return
      }
      const { deny } = await $.ui.blit({ requestId: band.requestId, key: KEY, cells: encode(grid, band.columns) })
      if (deny) band = null // collapsed or unmounted; the next render brings it back
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
```

- [ ] **Passo 5: rodar**

Rode: `claude plugin validate . && claude plugin test .`
Esperado: PASS (53 pass, 0 fail). A linha `hooks:` da validação passa a listar `classic.PostToolUseFailure, classic.PermissionRequest, classic.PermissionDenied`.

- [ ] **Passo 6: commit**

```bash
git add hooks/band.ts hooks/band.test.ts hooks/register.tsx
git commit -m "feat(band): a faixa lê o Look salvo e as reações do thread principal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

### Tarefa 8: O menu, parte pura

**Arquivos:**
- Criar: `hooks/menu.ts`, `hooks/menu.test.ts`

**Interfaces:**
- Consome: `composeBand`, `BandState` (Tarefa 7); `stage`, `VERBS`, `STAGE_W`; `Look`, `EXTRAS`, `isHex`; `PALETTES`, `paletteOf`; `fit`, `text`.
- Produz:
  - `MENU_ID = 'boneco'`, `PREVIEW_KEY = 'boneco-preview'`;
  - `STEPS` e `SUMMARY` (= 6);
  - o tipo `Option`, `OPTIONS: Record<StepKey, Option[]>`, `SWATCHES`, `hotkey(i)`;
  - os tipos `MenuState = { step: number; sub?: 'fixa' | 'led'; focused?: string; error?: string }` e `Press = { look: Look; state: MenuState; close?: true }`;
  - `openAt(arg)`, `press(look, s, key): Press`, `typeHex(look, s, typed): Press`, `preview(look, s): Look`, `isPicked(look, key, value)`;
  - `title(s)`, `progress(s)`, `summary(look): string[]`, `previewRows(b, s, now, columns): Cell[][]`.
- Chaves dos elementos:
  - `opt:<valor>`, `sw:<#hex>`, `tog:duo`, `tog:cheeks`, `hex` (o Input);
  - `nav:back`, `nav:next`, `nav:restart`, `nav:close`.
- Teclas fixas: `t` (liga/desliga), `v` (voltar), `c` (continuar), `r` (recomeçar), `f` (fechar).

- [ ] **Passo 1: teste que falha**: `hooks/menu.test.ts`

```ts
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
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `claude plugin test .`
Esperado: FAIL (módulo `./menu` não existe).

- [ ] **Passo 3: implementar**: `hooks/menu.ts`

```ts
// /boneco: the menu that picks the look one part at a time (paleta, cor, olhos,
// silhueta, chapéu, reações), the option under the focus ring previewed live.
// This half is pure: the parts and their options, what a press does to the
// look, the preview's rows. register.tsx draws the pane and owns $.

import { composeBand, type BandState } from './band'
import { STAGE_W, VERBS, stage, type Mood, type Scene } from './clawd'
import { EXTRAS, isHex, type Extra, type Look } from './look'
import { PALETTES, paletteOf } from './palettes'
import { fit, text, type Cell } from './paint'

export const MENU_ID = 'boneco'
export const PREVIEW_KEY = 'boneco-preview'

export type StepKey = 'palette' | 'color' | 'eyes' | 'shape' | 'hat' | 'extras'
export const STEPS: readonly { key: StepKey; arg: string; title: string }[] = [
  { key: 'palette', arg: 'paleta', title: 'Paleta' },
  { key: 'color', arg: 'cor', title: 'Cor' },
  { key: 'eyes', arg: 'olhos', title: 'Olhos' },
  { key: 'shape', arg: 'silhueta', title: 'Silhueta' },
  { key: 'hat', arg: 'chapeu', title: 'Chapéu' },
  { key: 'extras', arg: 'reacoes', title: 'Reações' },
]
export const SUMMARY = STEPS.length // the step after the last part

export type Option = { id: string; value: string; name: string; note: string; tag?: string }
const LINE = '+1 linha na faixa'

export const OPTIONS: Record<StepKey, Option[]> = {
  palette: PALETTES.map((p, i) => ({ id: `P${i}`, value: p.key, name: p.name, note: p.note })),
  color: [
    { id: 'C1', value: 'paleta', name: 'Da paleta', note: 'O destaque da paleta, como o mod faz hoje com o /theme.' },
    { id: 'C2', value: 'fixa', name: 'Cor fixa', note: 'Uma cor só dele, igual em qualquer paleta.' },
    { id: 'C3', value: 'arco', name: 'Arco-íris', note: 'O matiz gira devagar, uma volta a cada 10 s.' },
    { id: 'C4', value: 'modelo', name: 'Pelo modelo', note: 'Opus laranja, Sonnet azul, Haiku verde, Fable roxo.' },
    { id: 'C5', value: 'cena', name: 'Pela cena', note: 'Cozinha laranja, leitura azul, mágica roxa, dança rosa…' },
    { id: 'C6', value: 'contexto', name: 'Pelo contexto', note: 'Desbota abaixo de 50% de contexto e avermelha abaixo de 15%.' },
    { id: 'C7', value: 'effort', name: 'Pelo effort', note: 'A mesma rampa dos pips: low frio, max quente.' },
  ],
  eyes: [
    { id: 'O1', value: 'vazados', name: 'Vazados', note: 'Os furos de hoje, que mostram o fundo do terminal.' },
    { id: 'O2', value: 'grandes', name: 'Grandes', note: 'Dois pixels de altura. Perdem o olhar para cima.' },
    { id: 'O3', value: 'led', name: 'LED', note: 'Acesos numa cor; continuam piscando.' },
    { id: 'O4', value: 'oculos', name: 'Óculos escuros', note: 'Lentes escuras com um reflexo a cada 3 s.' },
    { id: 'O5', value: 'visor', name: 'Visor', note: 'Faixa escura com uma luz que varre de um lado a outro.' },
  ],
  shape: [
    { id: 'S1', value: 'classica', name: 'Clássica', note: 'O desenho da tela de boas-vindas.' },
    { id: 'S2', value: 'orelhas', name: 'Orelhinhas', note: 'Recorte no topo da cabeça. Some quando há chapéu.' },
    { id: 'S3', value: 'redondo', name: 'Cantos redondos', note: 'Quatro cantos a menos, mais fofo.' },
    { id: 'S4', value: 'fantasma', name: 'Fantasminha', note: 'Sem pernas: a barra de baixo ondula.' },
  ],
  hat: [
    { id: 'H0', value: 'none', name: 'Sem chapéu', note: 'Faixa com 3 linhas, como hoje.' },
    { id: 'H1', value: 'cartola', name: 'Cartola', note: 'Preta com fita vermelha.', tag: LINE },
    { id: 'H2', value: 'chef', name: 'Chapéu de chef', note: 'Toque branco, ótimo com a cena de cozinha.', tag: LINE },
    { id: 'H3', value: 'coroa', name: 'Coroa', note: 'Dourada, com uma pedra no meio.', tag: LINE },
    { id: 'H4', value: 'bone', name: 'Boné', note: 'Aba virada para o lado.', tag: LINE },
    { id: 'H5', value: 'festa', name: 'Chapéu de festa', note: 'Cone rosa com pompom.', tag: LINE },
    { id: 'H6', value: 'aureola', name: 'Auréola', note: 'Flutua e brilha devagar.', tag: LINE },
    { id: 'H7', value: 'antenas', name: 'Anteninhas', note: 'Da cor do corpo, de inseto.', tag: LINE },
    { id: 'H8', value: 'chifres', name: 'Chifrinhos', note: 'Vermelhos, de diabinho.', tag: LINE },
    { id: 'H9', value: 'gato', name: 'Orelhas de gato', note: 'Da cor do corpo.', tag: LINE },
    { id: 'H10', value: 'bruxo', name: 'Chapéu de bruxo', note: 'Roxo, de aba larga.', tag: LINE },
    { id: 'H11', value: 'obra', name: 'Capacete de obra', note: 'Amarelo, combina com a cena de construir.', tag: LINE },
    { id: 'H12', value: 'noel', name: 'Gorro de Noel', note: 'Vermelho com pompom branco.', tag: LINE },
    { id: 'H13', value: 'palha', name: 'Chapéu de palha', note: 'Aba bem larga, de festa junina.', tag: LINE },
    { id: 'H14', value: 'laco', name: 'Laço', note: 'Rosa, preso de lado.', tag: LINE },
    { id: 'H15', value: 'cena', name: 'Figurino por cena', note: 'Chef na cozinha, capacete na obra, bruxo na mágica, festa na dança…', tag: LINE },
    { id: 'H16', value: 'sazonal', name: 'Do calendário', note: 'Bruxo em outubro, gorro em dezembro, palha em junho, festa em janeiro.', tag: LINE },
  ],
  extras: [
    { id: 'X1', value: 'susto', name: 'Susto no erro', note: 'Uma ferramenta falhou: treme, olha para cima e mostra "!".' },
    { id: 'X2', value: 'suor', name: 'Suando', note: 'Contexto abaixo de 15%: fica pálido e sua.' },
    { id: 'X3', value: 'aceno', name: 'Aceno', note: 'Esperando sua permissão: acena e mostra "?".' },
    { id: 'X4', value: 'ocio', name: 'Ócio variado', note: 'Parado, olha em volta, boceja, se espreguiça e bate o pé.' },
    { id: 'X5', value: 'pet', name: 'Bichinho', note: 'Um companheiro de duas células que vai atrás dele.' },
  ],
}

export const SWATCHES: Record<'fixa' | 'led', readonly (readonly [hex: string, name: string])[]> = {
  fixa: [['#d77757', 'laranja Claude'], ['#f28fb3', 'rosa'], ['#6fa8ff', 'azul'], ['#7bd88f', 'verde'], ['#b18cff', 'roxo'], ['#f2c94c', 'amarelo'], ['#e8e8ee', 'branco'], ['#8b93a7', 'cinza robô']],
  led: [['#5ee6ff', 'ciano'], ['#7dff9a', 'verde'], ['#ffc94d', 'âmbar'], ['#ff5d6c', 'vermelho'], ['#ffffff', 'branco']],
}

// option keys, 17 for the hats: 1-9 then letters, skipping c f r t v (the fixed buttons')
const KEYS = '123456789abdeghij'
export const hotkey = (i: number): string | undefined => KEYS[i]

export type MenuState = { step: number; sub?: 'fixa' | 'led'; focused?: string; error?: string }
export type Press = { look: Look; state: MenuState; close?: true }

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
export const openAt = (arg: string): MenuState => ({ step: Math.max(0, STEPS.findIndex(s => s.arg === plain(arg))) })

const split = (key: string): [string, string] => {
  const i = key.indexOf(':')
  return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)]
}
const stepAt = (s: MenuState) => STEPS[s.step]?.key
const known = (key: StepKey, value: string) => OPTIONS[key].some(o => o.value === value)

export const isPicked = (look: Look, key: StepKey, value: string) =>
  key === 'extras' ? look.extras.includes(value as Extra) : look[key] === value

function apply(look: Look, key: StepKey, value: string): Look {
  if (key !== 'extras') return { ...look, [key]: value } as Look
  const on = look.extras.includes(value as Extra)
  return { ...look, extras: EXTRAS.filter(x => (x === value ? !on : look.extras.includes(x))) }
}
const swatch = (look: Look, sub: 'fixa' | 'led', hex: string): Look => ({ ...look, [sub === 'fixa' ? 'fixed' : 'led']: hex.toLowerCase() }) as Look

export function press(look: Look, s: MenuState, key: string): Press {
  const step = stepAt(s)
  const [kind, value] = split(key)
  const stay = { look, state: s }
  if (kind === 'opt') {
    if (!step || !known(step, value)) return stay
    const next = apply(look, step, value)
    if (step === 'extras') return { look: next, state: { step: s.step } }
    const sub = step === 'color' && value === 'fixa' ? 'fixa' : step === 'eyes' && value === 'led' ? 'led' : undefined
    if (sub) return { look: next, state: { step: s.step, sub } }
    return { look: next, state: { step: s.step + 1 } }
  }
  if (kind === 'sw') return s.sub && isHex(value) ? { look: swatch(look, s.sub, value), state: { step: s.step + 1 } } : stay
  if (kind === 'tog') return value === 'duo' || value === 'cheeks' ? { look: { ...look, [value]: !look[value] } as Look, state: s } : stay
  if (kind === 'nav') {
    if (value === 'back') return { look, state: s.sub ? { step: s.step } : { step: Math.max(0, s.step - 1) } }
    if (value === 'next') return { look, state: { step: Math.min(SUMMARY, s.step + 1) } }
    if (value === 'restart') return { look, state: { step: 0 } }
    if (value === 'close') return { look, state: s, close: true }
  }
  return stay
}

// the hex typed in the fixed color's field: '#a1b2c3', 'A1B2C3' and spaces around are fine
export function typeHex(look: Look, s: MenuState, typed: string): Press {
  if (s.sub !== 'fixa') return { look, state: s }
  const hex = `#${typed.trim().replace(/^#/, '')}`.toLowerCase()
  if (!isHex(hex)) return { look, state: { ...s, error: `"${typed.trim().slice(0, 16)}" não é uma cor: use #rrggbb` } }
  return { look: swatch(look, 'fixa', hex), state: { step: s.step + 1 } }
}

// the look with the focused option on, unsaved; on Reações the focused one shown on
export function preview(look: Look, s: MenuState): Look {
  const step = stepAt(s)
  const [kind, value] = split(s.focused ?? '')
  if (kind === 'opt' && step && known(step, value)) return step === 'extras' && isPicked(look, step, value) ? look : apply(look, step, value)
  if (kind === 'sw' && s.sub && isHex(value)) return swatch(look, s.sub, value)
  return look
}

export function title(s: MenuState): string {
  const st = STEPS[s.step]
  return st ? `Mini Claude · ${s.step + 1}/${STEPS.length} ${st.title}` : 'Mini Claude · pronto'
}

export const progress = (s: MenuState): string =>
  STEPS.map((st, i) => `${i < s.step ? '✓' : i === s.step ? '●' : '○'}${st.title}`).join(' ')

export function summary(look: Look): string[] {
  const named = (key: StepKey, value: string) => {
    const o = OPTIONS[key].find(o => o.value === value)
    return o ? `${o.id} ${o.name}` : value
  }
  return [
    `Paleta: ${named('palette', look.palette)}`,
    `Cor: ${named('color', look.color)}${look.color === 'fixa' ? ` ${look.fixed}` : ''}${look.duo ? ' + dois tons' : ''}`,
    `Olhos: ${named('eyes', look.eyes)}${look.eyes === 'led' ? ` ${look.led}` : ''}${look.cheeks ? ' + bochechas' : ''}`,
    `Silhueta: ${named('shape', look.shape)}`,
    `Chapéu: ${named('hat', look.hat)}`,
    `Reações: ${look.extras.length ? look.extras.map(x => named('extras', x)).join(', ') : 'nenhuma'}`,
  ]
}

// the preview acts out every scene in turn, 2.4 s each, so a color or a hat is seen everywhere
const DEMO: (Scene | 'idle')[] = ['idle', 'dance', 'cook', 'think', 'build', 'walk', 'magic', 'grow', 'wind']
function demo(t: number): { mood: Mood; scene?: Scene } {
  const s = DEMO[Math.floor(t / 2400) % DEMO.length] ?? 'idle'
  if (s === 'idle') return { mood: { working: false, since: t - 1000 } }
  return { mood: { working: true, since: t, word: VERBS[s].split(' ')[0], mode: 'thinking' }, scene: s }
}

// Paleta: the whole band; the other parts: the stage and, beside it, the option's name and note
export function previewRows(b: BandState, s: MenuState, now: number, columns: number): Cell[][] {
  const look = preview(b.look, s)
  const step = stepAt(s)
  if (step === 'palette') return composeBand({ ...b, look }, now, columns)
  const pal = paletteOf(look.palette, b.themeAccent)
  const { mood, scene } = demo(now)
  const st = stage(mood, now, pal.accent, scene, {
    look, palette: pal, model: b.ident.model, effortLevel: b.ident.effort,
    ctxLeft: step === 'extras' ? 9 : step === 'color' ? 100 - ((now / 90) % 100) : 72,
    reaction: step === 'extras' ? { sustoAt: now - (now % 2600), waiting: true } : undefined, // a startle, then a wave, over and over
  })
  const [kind, value] = split(s.focused ?? '')
  const o = step ? (OPTIONS[step].find(o => kind === 'opt' && o.value === value) ?? OPTIONS[step].find(o => isPicked(look, step, o.value))) : undefined
  const lines = o ? [text(`${o.id} ${o.name}`, pal.text), text(o.note, pal.faint), text(o.tag ?? '', pal.faint)] : []
  const right = Math.max(0, columns - STAGE_W - 2)
  const off = st.length - 3
  return st.map((row, i) => [...row, ...text('  ', pal.text), ...fit(lines[i - off] ?? [], right)])
}
```

Nota sobre `KEYS`: `c`, `f`, `r`, `t` e `v` ficam de fora porque são dos botões fixos (liga/desliga, voltar, continuar, recomeçar, fechar). As 17 teclas das opções são `1`–`9`, `a`, `b`, `d`, `e`, `g`, `h`, `i`, `j`. Isso muda a spec, que falava em `1`–`9` e `a`–`h`, para nenhuma tecla colidir.

- [ ] **Passo 4: rodar**

Rode: `claude plugin validate . && claude plugin test .`
Esperado: PASS (61 pass, 0 fail).

- [ ] **Passo 5: commit**

```bash
git add hooks/menu.ts hooks/menu.test.ts
git commit -m "feat(menu): partes, opções e prévia do /boneco (lógica pura)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

### Tarefa 9: O painel `/boneco`

**Arquivos:**
- Criar: `hooks/menu-pane.test.ts`
- Modificar: `hooks/register.tsx` (imports, estado do menu, registro do comando, relógio, quatro hooks novos)

**Interfaces:**
- Consome: tudo o que `menu.ts` produz (Tarefa 8), `STAGE_W`.
- Produz: comando `/boneco [paleta|cor|olhos|silhueta|chapeu|reacoes]` e painel `boneco`.

- [ ] **Passo 1: teste que falha**: `hooks/menu-pane.test.ts`

```ts
import { expect, mock, test } from 'claude-code/testing'

import { MENU_ID } from './menu'

const PANE = { title: 'Mini Claude', isFocused: true, bodyColumns: 100, placement: 'inline' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} }
const TARGET = { plugin: 'dashboard', surface: 'terminal' as const, component: 'Pane' as const, requestId: MENU_ID, props: PANE }

test('/boneco chapeu: the hat part, a key per option; a press saves and moves on', async ($, on) => {
  mock.store(on)
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
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `claude plugin test .`
Esperado: FAIL em `menu-pane.test.ts` (nada desenha o painel `boneco`).

- [ ] **Passo 3: implementar no `register.tsx`**

Junte `STAGE_W` ao import de `./clawd` que já existe e acrescente:

```ts
import {
  MENU_ID, OPTIONS, PREVIEW_KEY, STEPS, SUMMARY, SWATCHES, hotkey, isPicked, openAt, press, previewRows, progress, summary, title, typeHex,
  type MenuState, type Press,
} from './menu'
```

Estado, logo depois de `let reaction: Reaction = {}`:

```ts
  let menu: MenuState | undefined // /boneco open: which part, what the focus is on
  let pane: { columns: number; rows: number } | null = null // the menu's preview Raster, as last drawn
  const bandState = () => ({ mood, tool, scene: director.scene, gauges, ident, themeAccent: accent, look, reaction, name })
```

Em `session.start`, depois do `$.command.register` do `nome`:

```ts
    await $.command.register({
      name: 'boneco',
      description: 'Personaliza o mini Claude e as cores da faixa, uma parte por vez',
      argumentHint: '[paleta|cor|olhos|silhueta|chapeu|reacoes]',
    })
```

O relógio de 30 fps (`$.clock.every(1000 / FPS, ...)`) passa a pintar também a prévia do menu. Troque a função inteira por:

```ts
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
```

Hooks novos, depois do `command.run` do `nome`:

```tsx
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
            {s.error ? <Text dimColor>{`✗ ${s.error}`}</Text> : null}
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
```

- [ ] **Passo 4: rodar**

Rode: `claude plugin validate . && claude plugin test .`

Esperado:
- a validação passa e lista `command.run{command=boneco}` em "answers its own command";
- os testes passam: 63 pass, 0 fail.

**Se o primeiro teste falhar porque o painel não desenha nada**, confira duas coisas:
- se o `command.run` chegou: o `title` deve ser `5/6 Chapéu`;
- se a validação acusa `$ is passed to`. Nesse caso, alguma closure está recebendo `$` como argumento. Ela deve **capturar** o `$` (como `done` faz), nunca recebê-lo.

- [ ] **Passo 5: verificação manual no terminal real**

```bash
tmux new-session -d -s probe -x 160 -y 50 "CLAUDE_CODE_PLUGIN_DIRS=$HOME/Documentos/dashboard-boneco claude --debug-file /tmp/probe.log"
sleep 8; grep -m1 -o 'dashboard-boneco' /tmp/probe.log || echo 'carregou o mod original: faça este passo depois do merge'
tmux send-keys -t probe '/boneco chapeu' Enter; sleep 2; tmux capture-pane -t probe -p | tail -30
tmux send-keys -t probe '4'; sleep 1; tmux capture-pane -t probe -p | tail -30
tmux send-keys -t probe Escape; sleep 1; tmux capture-pane -t probe -p | tail -12
tmux kill-session -t probe
```

Esperado, nesta ordem:
1. o painel aparece com `Mini Claude · 5/6 Chapéu`, a prévia e as opções numeradas;
2. com `4`, o título vira `6/6 Reações`;
3. com Esc, o painel fecha e a faixa mostra a coroa (4 linhas).

Erros do mod aparecem em `/tmp/probe.log` como `hook failed: dashboard`.

- [ ] **Passo 6: commit**

```bash
git add hooks/register.tsx hooks/menu-pane.test.ts
git commit -m "feat(menu): painel /boneco com prévia ao vivo e atalhos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

### Tarefa 10: Linhas de subagents no Windows (`.ps1`)

**Arquivos:**
- Criar: `extras/subagent-statusline.ps1`, `extras/check-ps1.sh`
- Modificar: `extras/subagent-statusline.sh` (uma linha: o relógio pode vir de `SUBAGENT_STATUSLINE_NOW`)

**Interfaces:**
- Produz: o mesmo contrato do `.sh`. Entrada `{columns, tasks: [...]}` pelo stdin. Saída: uma linha JSON `{"id","content"}` por tarefa. A variável `SUBAGENT_STATUSLINE_NOW` (segundos Unix) fixa o relógio nos dois scripts.

- [ ] **Passo 1: verificação que falha**: `extras/check-ps1.sh`

```bash
#!/usr/bin/env bash
# Dev check: the PowerShell port prints what the jq script prints, row for row
# (compared as JSON, since each serializer escapes its own way). Needs jq and
# pwsh (or powershell). Run from anywhere: bash extras/check-ps1.sh
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
ps=$(command -v pwsh || command -v powershell)
export SUBAGENT_STATUSLINE_NOW=1760000000.5

sample='{"columns":130,"tasks":[
 {"id":"a1","name":"Explore","agentType":"Explore","status":"running","label":"find auth callers","startTime":1759999917000,"model":"claude-sonnet-5-5","effort":"high","contextWindowSize":200000,"tokenCount":45210,"tokenSamples":[0,1200,5000,9000,9000,15000,30000,45210]},
 {"id":"a2","agentType":"general-purpose","status":"completed","description":"revisar o diff \u001b[31mvermelho\u001b[0m\ncom quebra","startTime":1759996000000,"model":"opus","effort":7300,"tokenCount":1250000,"tokenSamples":[]},
 {"id":"a3","status":"failed","label":"ação com acentos e emoji 🚀 no meio de um rótulo bem comprido que não cabe na linha de jeito nenhum","tokenCount":500},
 {"id":"a4","name":"Plan","status":"killed","effort":"turbo","contextWindowSize":1000000,"tokenCount":0},
 {"id":"a5","name":"x","status":"queued","startTime":1756400000000}
]}'

fail=0
for cols in 130 50; do
  input=$(printf '%s' "$sample" | jq -c ".columns = $cols")
  want=$(printf '%s' "$input" | bash "$here/subagent-statusline.sh" | jq -c .)
  got=$(printf '%s' "$input" | "$ps" -NoProfile -File "$here/subagent-statusline.ps1" | jq -c .)
  if [[ "$want" == "$got" ]]; then echo "ok   columns=$cols"; else echo "FAIL columns=$cols"; diff <(echo "$want") <(echo "$got") || true; fail=1; fi
done
exit $fail
```

Rode: `bash extras/check-ps1.sh`
Esperado: FAIL. O `.ps1` ainda não existe e o `pwsh` reclama do arquivo.

- [ ] **Passo 2: relógio fixável no `.sh`**

Em `extras/subagent-statusline.sh`, troque a linha `  | (now) as $now` por:

```
  | ($ENV.SUBAGENT_STATUSLINE_NOW // now | tonumber) as $now   # fixed clock for extras/check-ps1.sh
```

- [ ] **Passo 3: implementar**: `extras/subagent-statusline.ps1`

```powershell
# Claude Code subagentStatusLine for Windows: PowerShell 5.1 or 7, no jq. One
# row per subagent in the agent panel, the same rows subagent-statusline.sh
# prints (extras/check-ps1.sh compares them).
#
#   ⠹ Explore         find auth callers…   ▁▂▅▇▃▂▁▁ 45.2k  23% │ 1m23s │ sonnet ▰▰▰▱▱
#
# settings.json:
#   "subagentStatusLine": { "type": "command", "command":
#     "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/<you>/.claude/mods/dashboard/extras/subagent-statusline.ps1" }
#
# Input: {columns, tasks:[{id,name?,agentType,status,label,description,startTime(ms),
# model?,effort?,contextWindowSize?,tokenCount,tokenSamples[]}]}. Output: one {"id","content"} JSON line per row.

# PowerShell 5.1 reads and writes the console in the OEM code page: the glyphs
# and any accented label would come out garbled. UTF-8 both ways, no BOM.
$utf8 = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$INV = [Globalization.CultureInfo]::InvariantCulture

$E = [char]27
function Fg([int]$r, [int]$g, [int]$b) { "$E[38;2;$r;$g;${b}m" }
$OFF = "$E[0m"
$DIM = Fg 70 72 86
$LBL = Fg 140 145 170

# numbers as jq prints them, whatever the Windows locale ("45.2", never "45,2")
function Num([double]$x) { $x.ToString($INV) }
function Round([double]$x) { [math]::Round($x, [MidpointRounding]::AwayFromZero) }

# text by code points, as jq counts it: an emoji is one, and is never cut in half
function Points([string]$s) {
  $out = New-Object System.Collections.Generic.List[string]
  for ($i = 0; $i -lt $s.Length; $i++) {
    if ([char]::IsHighSurrogate($s[$i]) -and $i + 1 -lt $s.Length) { $out.Add($s.Substring($i, 2)); $i++ }
    else { $out.Add([string]$s[$i]) }
  }
  return ,$out
}
function Len([string]$s) { (Points $s).Count }
function Pad([int]$n) { if ($n -gt 0) { ' ' * $n } else { '' } }
function Vis([string]$s) { Len ($s -replace "$E\[[0-9;]*m", '') }
function Fit([string]$s, [int]$w) {
  if ($w -le 0) { return '' }
  $p = Points $s
  if ($p.Count -gt $w) { return (-join $p.GetRange(0, $w - 1)) + '…' }
  return $s + (Pad ($w - $p.Count))
}
function RFit([string]$s, [int]$w) { (Pad ($w - (Len $s))) + $s }
function Two([double]$n) { if ($n -lt 10) { '0' + (Num $n) } else { Num $n } }
# task fields are text a model wrote: drop control characters (C0, DEL, C1) so
# an ESC in a label cannot reach the terminal as a live escape sequence
function Clean($v) { if ($null -eq $v) { '' } else { ([string]$v) -replace '\p{Cc}', '' } }

function KTok([double]$t) {
  if ($t -ge 1e6) { return (Num ([math]::Floor($t / 1e5) / 10)) + 'M' }
  if ($t -ge 1000) { return (Num ([math]::Floor($t / 100) / 10)) + 'k' }
  return (Num $t)
}
function Dur([double]$s) {
  $s = [math]::Floor($s)
  if ($s -lt 60) { return (Num $s) + 's' }
  if ($s -lt 3600) { return (Num ([math]::Floor($s / 60))) + 'm' + (Two ($s % 60)) + 's' }
  return (Num ([math]::Floor($s / 3600))) + 'h' + (Two ([math]::Floor(($s % 3600) / 60))) + 'm'
}

# token growth per tick as a sparkline; bar height also ramps the color
$BARS = '▁▂▃▄▅▆▇█'
function Spark($samples, [int]$w) {
  $s = @()
  if ($null -ne $samples) { $s = @($samples) }
  $d = @(for ($i = 1; $i -lt $s.Count; $i++) { [math]::Max(0, [double]$s[$i] - [double]$s[$i - 1]) })
  if ($d.Count -gt $w) { $d = @($d[($d.Count - $w)..($d.Count - 1)]) }
  $mx = 0
  foreach ($x in $d) { if ($x -gt $mx) { $mx = $x } }
  $out = $DIM + ('▁' * [math]::Max(0, $w - $d.Count))
  foreach ($x in $d) {
    $l = 0
    if ($mx -gt 0) { $l = [int](Round ($x * 7 / $mx)) }
    $out += (Fg (90 + $l * 4) (110 + $l * 15) (170 + $l * 12)) + $BARS[$l]
  }
  return $out + $OFF
}

# same continuous OKLCH ramp as the effort pips: green (low/full) -> red
$STOPS = @(@(117, 223, 143), @(176, 198, 60), @(221, 164, 0), @(246, 125, 0), @(247, 92, 97))
$LEVELS = @('low', 'medium', 'high', 'xhigh', 'max')
function Pips($e) {
  if ($e -isnot [bool] -and $e -is [ValueType]) { return $LBL + (Num ([math]::Floor([double]$e / 1000))) + 'k' + $OFF }
  $n = [array]::IndexOf($LEVELS, [string]$e)
  if ($n -lt 0) { return $LBL + (Clean $e) + $OFF }
  $out = ''
  for ($i = 0; $i -lt 5; $i++) {
    if ($i -le $n) { $c = $STOPS[$i]; $out += (Fg $c[0] $c[1] $c[2]) + '▰' } else { $out += $DIM + '▱' }
  }
  return $out + $OFF
}
# pct left -> color between the ramp stops, 100 = green, 0 = red
function Fuel([double]$left) {
  $i = 4 * (1 - [math]::Max([math]::Min($left, 100), 0) / 100)
  $j = [int][math]::Min([math]::Floor($i), 3)
  $f = $i - $j
  $a = $STOPS[$j]; $b = $STOPS[$j + 1]
  Fg (Round ($a[0] + ($b[0] - $a[0]) * $f)) (Round ($a[1] + ($b[1] - $a[1]) * $f)) (Round ($a[2] + ($b[2] - $a[2]) * $f))
}

$raw = [Console]::In.ReadToEnd()
try { $in = $raw | ConvertFrom-Json } catch { exit 0 }
$cols = 100
if ($null -ne $in.columns) { $cols = [int]$in.columns }
if ($env:SUBAGENT_STATUSLINE_NOW) { $now = [double]::Parse($env:SUBAGENT_STATUSLINE_NOW, $INV) }
else { $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() / 1000.0 }
$SPIN = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

foreach ($t in @($in.tasks)) {
  if ($null -eq $t) { continue }
  $run = $t.status -ceq 'running'
  if ($run) { $icon = (Fg 120 200 255) + $SPIN[[int]([math]::Floor($now) % 10)] }
  elseif ($t.status -ceq 'completed') { $icon = (Fg 117 223 143) + '✓' }
  elseif ($t.status -ceq 'failed') { $icon = (Fg 247 92 97) + '✗' }
  elseif ($t.status -ceq 'killed') { $icon = $DIM + '⊘' }
  else { $icon = $LBL + '•' }
  $icon += $OFF

  $title = 'agent'
  if ($null -ne $t.name) { $title = $t.name } elseif ($null -ne $t.agentType) { $title = $t.agentType }
  $left = "$icon " + (Fg 200 170 255) + "$E[1m" + (Fit (Clean $title) 16) + $OFF

  # fixed-width fields so the columns line up across rows
  $tok = 0
  if ($null -ne $t.tokenCount) { $tok = [double]$t.tokenCount }
  $used = $null
  if ($t.contextWindowSize) { $used = [math]::Min((Round ($tok * 100 / [double]$t.contextWindowSize)), 100) }
  $toks = $LBL + (RFit (KTok $tok) 6) + $OFF
  if ($null -ne $used) { $ctx = ' ' + (Fuel (100 - $used)) + (RFit ((Num $used) + '%') 4) + $OFF } else { $ctx = Pad 5 }
  $start = $now * 1000
  if ($null -ne $t.startTime) { $start = [double]$t.startTime }
  $age = $LBL + (RFit (Dur (($now * 1000 - $start) / 1000)) 6) + $OFF
  $m = ''
  if ($null -ne $t.model) { $m = [string]$t.model }
  if ($m -cmatch 'claude-([a-z]+)') { $m = $Matches[1] }
  $mdl = (Fg 120 200 255) + (Fit (Clean $m) 6) + $OFF
  $eff = ''
  if ($null -ne $t.effort) { $eff = Pips $t.effort }
  $eff += Pad (5 - (Vis $eff))
  $spark = Spark $t.tokenSamples 8
  $sep = $DIM + ' │ ' + $OFF

  $full = "$spark $toks$ctx$sep$age$sep$mdl $eff"
  $compact = "$toks$sep$age"
  if ($cols - (Vis $left) - (Vis $full) - 2 -ge 10) { $right = $full } else { $right = $compact }
  $room = $cols - (Vis $left) - (Vis $right) - 2
  if ($run) { $lc = Fg 205 208 222 } else { $lc = $LBL }
  $label = $t.label
  if ($null -eq $label) { $label = $t.description }
  $label = (Clean $label) -replace '\s+', ' '
  $content = "$left $lc" + (Fit $label $room) + "$OFF $right"
  [Console]::Out.Write((ConvertTo-Json -Compress -InputObject ([pscustomobject]@{ id = $t.id; content = $content })) + "`n")
}
```

- [ ] **Passo 4: rodar a verificação**

Rode: `bash extras/check-ps1.sh`
Esperado: `ok   columns=130` e `ok   columns=50`, com saída 0. Se aparecer `FAIL`, o `diff` mostra a linha. Corrija o `.ps1` até bater. O `.sh` é a referência e só muda no Passo 2.

Rode também: `claude plugin validate . && claude plugin test .`
Esperado: tudo verde (63 pass). O `.ps1` não entra nos testes do mod.

- [ ] **Passo 5: commit**

```bash
git add extras/subagent-statusline.ps1 extras/check-ps1.sh extras/subagent-statusline.sh
git commit -m "feat(windows): linhas de subagents em PowerShell, sem jq

Mesma saída do .sh, conferida por extras/check-ps1.sh; UTF-8 forçado
para o PowerShell 5.1 e números com InvariantCulture.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

### Tarefa 11: README, imagens e versão

**Arquivos:**
- Modificar: `README.md`, `docs/render.mts`, `.claude-plugin/plugin.json`
- Criar (gerados): `docs/looks.png`, `docs/palettes.png`

- [ ] **Passo 1: imagens novas em `docs/render.mts`**

Acrescente aos imports do topo:

```ts
import { composeBand } from '../hooks/band.ts'
import { DEFAULT_LOOK, EYE_MODES, HAT_KEYS, SHAPES, type Look } from '../hooks/look.ts'
import { OPTIONS } from '../hooks/menu.ts'
import { PALETTES } from '../hooks/palettes.ts'
```

Antes de `await browser.close()`, acrescente:

```ts
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
```

Rode, da raiz da worktree:
`PLAYWRIGHT_FROM=/home/kyso/Documentos/PortalChamados/package.json npx -y tsx docs/render.mts docs`
Esperado: `ok docs`, e os arquivos `docs/looks.png` e `docs/palettes.png` gerados. Os GIFs antigos são refeitos iguais, exceto a bancada da cena construindo, agora com dois tons. Abra `docs/looks.png` com a ferramenta Read e confira se os 14 chapéus, os 5 olhos e as 4 silhuetas estão legíveis.

- [ ] **Passo 2: README**

1. Na seção **O mini Claude**, depois do item `/nome Kiko`, acrescente:

```markdown
- **`/boneco`** abre um menu para vestir o mini Claude e escolher as cores da faixa, uma parte por vez (veja abaixo).
```

2. Antes da seção **Instalação**, acrescente:

````markdown
## /boneco: personalize

`/boneco` abre um painel acima do prompt e passa por seis partes. A seta passa pelas opções e a prévia mostra cada uma animada. Enter (ou a tecla ao lado do nome) escolhe e segue para a próxima parte. A escolha fica salva e vale para as próximas sessões. Esc fecha o painel sem desfazer nada. Para abrir direto numa parte, use `/boneco chapeu` (ou `paleta`, `cor`, `olhos`, `silhueta`, `reacoes`).

| Parte | Opções |
|---|---|
| Paleta | Do /theme (o padrão), Clássico, Chamados, Catppuccin Mocha, Dracula, Tokyo Night, Nord, Gruvbox, Rosé Pine, Synthwave, Fósforo, Âmbar, Daltonismo (rampa azul → laranja), Papel (terminal claro) |
| Cor | da paleta, fixa (8 amostras ou qualquer hex), arco-íris, pelo modelo, pela cena, pelo contexto, pelo effort; e dois tons |
| Olhos | vazados, grandes, LED colorido, óculos escuros, visor; e bochechas |
| Silhueta | clássica, orelhinhas, cantos redondos, fantasminha |
| Chapéu | 14 chapéus, figurino por cena ou pelo calendário. Um chapéu põe 1 linha a mais na faixa. |
| Reações | susto quando uma ferramenta falha, aceno quando pede permissão, suor com pouco contexto, ócio variado, bichinho |

![Chapéus, olhos e silhuetas](docs/looks.png)

![A faixa em cada paleta](docs/palettes.png)
````

3. Dentro de **Instalação**, depois de **Linhas de subagents (opcional)**, acrescente:

````markdown
### Windows

O mod funciona no Windows nativo. Use o **Windows Terminal** com uma Nerd Font; o console antigo (conhost) não desenha truecolor direito.

```powershell
git clone https://github.com/kyso1/claude-code-dashboard "$env:USERPROFILE\.claude\mods\dashboard"
```

Em `%USERPROFILE%\.claude\settings.json`, com barras normais nos caminhos:

```json
{
  "env": { "CLAUDE_CODE_PLUGIN_DIRS": "C:/Users/<você>/.claude/mods/dashboard" },
  "subagentStatusLine": { "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/<você>/.claude/mods/dashboard/extras/subagent-statusline.ps1" }
}
```

O `.ps1` faz o mesmo que o `.sh`, sem precisar de `jq`. No Windows, o Claude Code roda esses comandos no Git Bash se ele estiver instalado, e no PowerShell se não estiver. Com Git Bash e `jq` (`winget install jqlang.jq`), o `.sh` também funciona.
````

4. Na tabela de **Personalizar**, acrescente as linhas:

```markdown
| Paletas (cores, rampa dos medidores) | `PALETTES` em `hooks/palettes.ts` |
| Chapéus (pixel a pixel) | `HAT_PIXELS` em `hooks/wardrobe.ts` |
| Opções e textos do `/boneco` | `OPTIONS` em `hooks/menu.ts` |
```

5. Em **Como funciona**, troque o bloco da árvore por:

```
hooks/
  register.tsx   eventos do Claude Code -> estado -> faixa; o painel /boneco
  band.ts        as linhas da faixa: palco + identidade, legenda e medidores
  clawd.ts       o mini Claude: cenas, reações, legenda
  wardrobe.ts    o que ele veste: cor do corpo, olhos, silhueta, chapéus
  pixels.ts      a grade de pixels de quadrante (2x2 por célula, até 2 cores)
  look.ts        as escolhas do /boneco, lidas campo a campo do $.store
  palettes.ts    as 14 paletas
  menu.ts        as partes do /boneco, o que cada tecla faz, a prévia
  gauges.ts      medidores, rampa de cor e brilho
  identity.ts    modelo, effort, pasta, branch, custo e plano
  paths.ts       pasta do usuário e caminhos no Windows
  paint.ts       cores OKLCH e a grade de células do Raster
extras/
  subagent-statusline.sh    linhas de subagents (jq)
  subagent-statusline.ps1   as mesmas, em PowerShell (Windows)
  check-ps1.sh              confere que as duas imprimem o mesmo
```

6. Na tabela de hooks de **Como funciona**, acrescente:

```markdown
| `classic.PostToolUseFailure`, `classic.PermissionRequest`, `classic.PermissionDenied` | as reações do `/boneco` |
| `command.run` (`boneco`), `ui.render` em `Pane`, `ui.focus`, `ui.close` | o painel do `/boneco` e sua prévia |
```

7. Em **Desenvolvimento**, troque `# 22 testes: ...` pelo número que `claude plugin test .` imprime agora, e acrescente a linha `bash extras/check-ps1.sh   # o .ps1 imprime o mesmo que o .sh (precisa de pwsh e jq)`.

- [ ] **Passo 3: versão**

Em `.claude-plugin/plugin.json`, troque `"version": "0.3.0"` por `"version": "0.4.0"`.

- [ ] **Passo 4: rodar**

Rode: `claude plugin validate . && claude plugin test . && bash extras/check-ps1.sh`
Esperado: tudo verde.

- [ ] **Passo 5: commit**

```bash
git add README.md docs/render.mts docs/looks.png docs/palettes.png docs/*.gif docs/*.mp4 docs/subagents.png .claude-plugin/plugin.json
git commit -m "docs: /boneco, Windows e imagens das roupas e paletas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YATxeKfmxPzKM9B7aSqaoT"
```

---

## Depois das tarefas

Use superpowers:finishing-a-development-branch. O merge de `feat/boneco` em `main`, na pasta `~/.claude/mods/dashboard`, recarrega o mod nas sessões abertas. Faça o Passo 5 da Tarefa 9 de novo depois disso, se ele foi adiado. Push só com pedido explícito.
