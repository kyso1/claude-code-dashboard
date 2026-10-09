# Personalização do mini Claude e menu `/boneco`: design

- **Data:** 2026-10-08
- **Status:** aprovado em conversa e aguardando revisão desta spec
- **Referência visual:** galeria "Estúdio do Mini Claude" (artifact privado, https://claude.ai/artifact/1oqbYyavDTfzpwg94eGgHM). Os desenhos, as cores e os textos abaixo saem dela.

## 1. Objetivo

A pessoa escolhe a aparência do mini Claude e das cores da faixa num menu dentro do terminal, uma parte por vez: **Paleta → Cor → Olhos → Silhueta → Chapéu → Reações**. Todas as opções da galeria entram. O mod continua funcionando no Linux e no macOS e passa a funcionar também no **Windows nativo**.

**Critérios de sucesso**
- Sem escolha nenhuma, a faixa fica exatamente como hoje: mesma altura, mesmas cores e mesmo comportamento.
- `/boneco` abre o menu, a seta mostra a prévia da opção em foco, e Enter (ou a tecla de atalho) escolhe e passa para a próxima parte. A escolha vale para a sessão atual e para as seguintes.
- O rosto e o chapéu ficam legíveis em todo quadro de toda cena, para qualquer combinação. Os testes garantem isso.
- No Windows, a faixa mostra pasta, branch, plano e tema, e as linhas dos subagents aparecem sem Git Bash e sem `jq`.

**Fora do escopo**
- As linhas dos subagents (`extras/subagent-statusline.*`) continuam com as cores clássicas. Os scripts rodam fora do engine e não leem o `$.store`.
- A galeria fica só como referência e não é empacotada com o mod.

## 2. O estado: `Look`

Um objeto, guardado em `$.store` sob a chave `look`, como o `/nome` já guarda `name`.

```ts
type Look = {
  palette: 'tema' | PaletteKey          // 'tema' = P0, o comportamento de hoje
  color: 'paleta' | 'fixa' | 'arco' | 'modelo' | 'cena' | 'contexto' | 'effort'
  fixed: string                         // '#rrggbb', usado com color 'fixa'
  duo: boolean                          // dois tons
  eyes: 'vazados' | 'grandes' | 'led' | 'oculos' | 'visor'
  led: string                           // '#rrggbb', usado com eyes 'led'
  cheeks: boolean
  shape: 'classica' | 'orelhas' | 'redondo' | 'fantasma'
  hat: 'none' | HatKey | 'cena' | 'sazonal'
  extras: ExtraKey[]                    // 'susto' | 'suor' | 'aceno' | 'ocio' | 'pet'
}
```

- **Padrão** (`DEFAULT_LOOK`): `tema`, `paleta`, `#d77757`, `false`, `vazados`, `#5ee6ff`, `false`, `classica`, `none`, `[]`. É a faixa de hoje.
- **Leitura validada campo a campo.** O store é uma fronteira de confiança: pode ter versão antiga, campo desconhecido ou lixo. Valor inválido cai no padrão daquele campo. Cor só passa se casar com `^#[0-9a-f]{6}$`. Extras desconhecidos são descartados e repetidos são removidos.
- **Um só lugar para ler e escrever:** `readLook(raw: unknown): Look` (função pura, testada) e `saveLook($, look)`.

## 3. Paletas (`hooks/palettes.ts`, novo)

```ts
type Palette = {
  key: string; name: string; note: string
  accent: Paint                 // mascote (modo 'paleta') e selo do modelo
  ramp: (left: number) => Paint // medidores e pips, 100 = cheio
  text: Paint; faint: Paint; folder: Paint; branch: Paint
  dark: boolean                 // false: selos e trilhos claros (terminal claro)
}
```

- **P0 `tema`:** o accent vem do token `claude` do tema customizado, como o `themeAccent()` faz hoje. Todo o resto é o clássico.
- **P1–P13**, com os hex da galeria: Clássico, Chamados, Catppuccin Mocha, Dracula, Tokyo Night, Nord, Gruvbox, Rosé Pine, Synthwave, Fósforo, Âmbar, Daltonismo, Papel.
  - O Clássico usa a fórmula atual de `ramp()`, sem mudar nada.
  - As outras rampas interpolam em OKLCH, com o matiz pelo caminho curto, entre 4 paradas que vão de cheio a vazio.
- **`gauges.ts` e `identity.ts`** recebem a paleta em vez de usar `TEXT`, `FAINT`, `ramp` e as cores fixas. O `ramp()` atual continua exportado como o ramp do Clássico.
- **`dark: false` (Papel):** selo L 0,87–0,88, trilho L 0,91, texto do selo L 0,30–0,32. Os valores são os da galeria.
- **Cores fora do sRGB:** `rgb()` já corta no gamut. Um teste confere que nenhuma paleta tem canal 0 ou 255 nos accents, para não haver corte visível.

## 4. Desenho do mascote (`hooks/clawd.ts`)

### 4.1 Célula com duas cores
`toCells` tem uma regra nova. Se os 4 quadrantes estão preenchidos e há exatamente 2 cores, a cor minoritária vira o glifo (`fg`) e a outra vira o fundo (`bg`). No empate, o glifo fica com a primeira cor na ordem UL, UR, LL, LR. Com 2 cores mais um furo, ou com 3 cores, a regra de hoje continua valendo: maioria, sem `bg`. Os desenhos abaixo foram feitos para nunca cair nesse caso. Os testes da §9 garantem.

### 4.2 Altura do palco
- **3 linhas** quando `hat === 'none'`.
- **4 linhas** com qualquer outro valor, inclusive `cena` e `sazonal`, para a faixa não mudar de altura entre cenas.
- **Deslocamento:** o sprite e os objetos da cena descem 2 pixels, ou seja, uma célula inteira. Isso respeita a regra de só mover em células inteiras. O chapéu ocupa os pixels y −2 e −1, relativos à cabeça.
- **Lado direito:** o texto ocupa as linhas `off..off+2`, com `off = linhas − 3`.

### 4.3 Cor do corpo (`color`)
| Modo | Cor |
|---|---|
| paleta | `palette.accent` |
| fixa | `look.fixed` |
| arco | `[0.75, 0.15, (t/28) % 360]` |
| modelo | Opus `[.67,.13,40]`, Sonnet `[.70,.12,250]`, Haiku `[.80,.14,150]`, Fable `[.70,.15,315]`; outro modelo usa o accent |
| cena | `[0.73, 0.14, matiz]`. Matizes: cook 45, think 255, build 90, walk 170, magic 305, dance 350, grow 140, wind 215. Fora de cena, o accent |
| contexto | ≥ 50%: accent; 50→15%: mistura com `lift(accent, .08, .3)`; < 15%: mistura com `[.64,.17,25]` |
| effort | `palette.ramp(100 − 25·nível)` |

**`duo`:** a cabeça (y 0–1) usa `lift(c, .07, .85)` e a base (y 2–4) usa `lift(c, −.05, 1.05)`. A troca de cor cai na borda entre células e não cria célula mista.

### 4.4 Olhos, bochechas e silhueta
- **Olhos**
  - `vazados`: como hoje.
  - `grandes`: furos em (5,0), (5,1), (12,0) e (12,1). Olhar para cima não muda nada.
  - `led`: o pixel do olho na cor `look.led`.
  - `oculos`: (4–5, 1) e (12–13, 1) em `SHADE`. A cada 3,4 s, cada lente fica `GLINT` por 150 ms, primeiro a esquerda e depois a direita.
  - `visor`: (4–13, 1) em `VISOR`, com uma luz `SCAN` de 2 pixels alinhada à célula, indo e voltando em passos de 150 ms.
- **`cheeks`:** (4,2) e (13,2) em `BLUSH`.
- **Silhueta**
  - `orelhas`: tira (6–11, 0). Olhar para cima vira olhar de frente. Com chapéu, vale a clássica.
  - `redondo`: tira (3,0), (14,0), (3,3) e (14,3).
  - `fantasma`: em vez das pernas, a linha y 4 alterna entre x par e x ímpar a cada 240 ms.

### 4.5 Chapéus
A tabela de pixels `HATS` é copiada da galeria e vai de `cartola` a `laco`. São 14 chapéus, e `antenas` e `gato` usam a cor da cabeça. Os glifos esperados ficam como referência para os testes:

```
cartola ▄▀▀▀▄   chef ▝▀▀▀▘   coroa ▐▄▀▄▌   bone ▟███▙▄▖   festa ▗▀▖   aureola ▀▀▀
antenas ▚   ▞   chifres ▝▖   ▗▘   gato ▙   ▟   bruxo ▗▄▄▟█▄▖   obra ▗▟███▙▖
noel ▄▀▀▀█   palha ▄▄▀▀▀▄▄   laco ▐▄▌
```

- **`cena`:** cook → chef, build → obra, magic → bruxo, dance → festa, walk → boné, grow → palha, wind → noel, think → cartola. Fora de cena, sem chapéu, mas a altura continua 4.
- **`sazonal`:** outubro → bruxo, dezembro → noel, junho e julho → palha, janeiro → festa. Nos outros meses, sem chapéu (altura 4). O mês vem do relógio local.

### 4.6 Assinatura
`stage(m, t, look, ctx: StageCtx, scene?)`, com `StageCtx = { palette, accent, ctxLeft?, model?, effortLevel?, reaction? }`. `caption()` usa a cor do corpo na estrela e no verbo, como hoje usa o accent.

## 5. Reações e companhia

| Extra | Gatilho | O que faz |
|---|---|---|
| susto | `classic.PostToolUseFailure` do thread principal | Por 1,3 s, no lugar da cena: treme entre as células 1 e 2 a cada 70 ms nos primeiros 450 ms, olha para cima com os braços para cima e mostra `!` em `ERR` |
| aceno | `classic.PermissionRequest` do thread principal | Até a próxima `tool.call`, `classic.PostToolUse`, `classic.PostToolUseFailure`, `classic.PermissionDenied` ou `turn.complete`: acena com o braço direito a cada 200 ms e mostra `?` piscando |
| suor | contexto restante < 15% | Em qualquer fase: o corpo fica `lift(c, .03, .55)` e cai uma gota ao lado da cabeça |
| ocio | fase `idle` | Ciclo de 9 s: olha em volta, boceja e se espreguiça, bate o pé, fica parado |
| pet | sempre | Bichinho de 2 células: atrás do mascote quando ele passeia, ao lado nas outras cenas, abanando o rabo a cada 250 ms |

- **Prioridade:** susto > aceno > cena, comemoração ou ócio. O suor e o bichinho se somam a qualquer um.
- **`HOLD_MS`:** só vale entre cenas. Reação entra e sai na hora.
- **No plano:** confirmar no `index.d.ts` os campos de `PostToolUseFailure` e `PermissionRequest`, inclusive o `agent_id` para filtrar os subagents.

## 6. Menu `/boneco` (`hooks/menu.tsx`, novo)

**Abrir**
- Comando `boneco`, com `argumentHint: '[paleta|cor|olhos|silhueta|chapeu|reacoes]'`. O argumento abre direto naquela parte. Argumento desconhecido abre na primeira.
- Abre com `$.ui.open({ id: 'boneco', title: 'Mini Claude', focus: true, closeOnEscape: true, holdToasts: true, rows: 14 })`. Como é uma resposta a um comando, o painel aparece em qualquer largura.

**Estado do menu (fica na memória)**
- `step` (0–6, onde 6 é o resumo).
- `focused` (o `key` do elemento em foco).
- `sub` (`'fixa' | 'led' | undefined`).

**Desenho** (`ui.render` para `{ component: 'Pane', requestId: 'boneco' }`)
1. Cabeçalho: `Mini Claude · 5/6 Chapéu`.
2. Prévia em `Raster`, animada pelo mesmo relógio da faixa com `$.ui.blit` e `key` próprio:
   - na Paleta, a faixa inteira montada com o `Look` candidato;
   - nas outras partes, o palco e, à direita, `Nome: nota`, mais a tag `+1 linha na faixa` quando houver.
3. Opções como `Button`s num `Box` com `flexWrap="wrap"`:
   - `key: opt:<valor>`;
   - tecla de atalho na ordem `1–9`, `a–h` (são no máximo 17 chapéus);
   - a opção salva vem marcada com `✓`.
4. Liga/desliga: Dois tons (em Cor) e Bochechas (em Olhos), como `Button`s `tog:<campo>`. O rótulo mostra o estado.
5. Subpassos:
   - escolher `fixa` abre `sub = 'fixa'`, com 8 amostras e um `Input` para hex;
   - escolher `led` abre `sub = 'led'`, com 5 amostras;
   - hex inválido não salva e a nota de erro aparece abaixo do campo.
6. Linha de progresso (`✓Paleta ✓Cor ●Olhos ○Silhueta …`), `[← voltar]` e o texto de ajuda das teclas.
7. Resumo (passo 6): uma linha por parte, mais `[Fechar]` e `[Recomeçar]`. Recomeçar volta ao passo 0 sem apagar nada.

**Prévia ao vivo**
- `on('ui.focus', { component: 'Pane', requestId: 'boneco' })` guarda o `element`.
- A prévia aplica `opt:<valor>` por cima do `Look` salvo. Se o foco está fora das opções, mostra o salvo.

**Escolher**
- O `onPress` de `opt:<valor>` salva o campo em `$.store`, atualiza o `Look` vivo (a faixa muda na hora) e avança um passo.
  - Exceções: `fixa` e `led` abrem o subpasso, e o passo de Reações é múltiplo.
- Em Reações, cada opção liga ou desliga e `[Continuar]` avança.

**Sair**
- Esc fecha o painel (`closeOnEscape`).
- Tudo o que foi escolhido já está salvo.
- O estado do menu é zerado no `ui.close`.

**Outros comandos**
- `/nome` continua igual.
- Se o painel não puder ser colocado (`isPlaced: false`), um toast diz o motivo.

## 7. Windows

**Como o Claude Code roda comandos no Windows** (docs `statusline` e `hooks`):
- os comandos de `statusLine` e de `subagentStatusLine` rodam no **Git Bash, se ele estiver instalado**, e no **PowerShell, se não estiver**;
- o `~` vira a pasta do usuário;
- o Git for Windows não traz `jq`.

Por isso o `.sh` só funciona no Windows com Git Bash e com `jq` instalado à parte.

**Mod (TypeScript, roda dentro do engine)**
- Pasta do usuário: `HOME ?? USERPROFILE`, num helper `homeDir($)` usado nos três lugares que hoje leem `HOME` (`readIdentity`, `settingsEffort` e `themeAccent`).
- Caminhos: o nome da pasta e o detalhe de `file_path` passam a separar por `/` e por `\` (`/[\\/]/`). Também é um helper puro, testado com entradas do Windows.
- `git` sai do `$.process.run` como hoje. O Claude Code no Windows já exige o Git for Windows, então o `git` está no PATH. Se faltar, a branch fica vazia, como em pasta sem repositório.

**Linhas de subagents: `extras/subagent-statusline.ps1`, novo**
- Porta 1:1 do `.sh`, com a mesma saída (`{"id","content"}` por linha) e as mesmas cores. Funciona no Windows PowerShell 5.1 e no PowerShell 7, sem `jq`.
- **Codificação (armadilha do 5.1):** o script começa com `[Console]::InputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)`. Sem isso, os glifos (`▁▂ ⠹ │`) e os acentos se corrompem na página de código OEM.
- O ESC é `[char]27`, porque o `` `e `` não existe no 5.1.
- **Segurança:** como no `.sh`, os campos de texto vindos das tarefas passam por um filtro que remove os caracteres de controle `\p{Cc}` antes de chegar ao terminal.

**README, seção nova "Windows"**
- **Terminal:** Windows Terminal com Nerd Font; o conhost antigo não é suportado.
- **Clone:** para `%USERPROFILE%\.claude\mods\dashboard`.
- **`CLAUDE_CODE_PLUGIN_DIRS`:** apontando para essa pasta.
- **`subagentStatusLine`:**
  ```json
  { "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/<você>/.claude/mods/dashboard/extras/subagent-statusline.ps1" }
  ```
- **Alternativa:** com Git Bash e `jq` instalados (`winget install jqlang.jq`), o `.sh` também serve.

## 8. Arquivos

| Arquivo | Mudança |
|---|---|
| `hooks/look.ts` (novo) | `Look`, `DEFAULT_LOOK`, `readLook`, catálogos (rótulos, notas, ids P/C/O/S/H/X) |
| `hooks/palettes.ts` (novo) | `Palette`, as 14 paletas, rampa interpolada |
| `hooks/clawd.ts` | célula bicolor, palco de 3 ou 4 linhas, cores, olhos, silhuetas, chapéus, reações, bichinho |
| `hooks/gauges.ts`, `hooks/identity.ts` | recebem `Palette` |
| `hooks/register.tsx` | carrega e salva o `Look`, eventos de reação, `homeDir`, separador de caminho, liga o menu |
| `hooks/menu.tsx` (novo) | passos, desenho do painel, prévia e escolha |
| `hooks/paths.ts` (novo) | `homeDir`, `baseName`, `lastTwo`: helpers puros |
| `extras/subagent-statusline.ps1` (novo) | porta para PowerShell |
| `README.md` | seções `/boneco`, Personalizar e Windows |
| `docs/render.mts` | GIF novo do menu e do mostruário de chapéus |

## 9. Testes (`claude plugin test .`)

- **look:** `readLook` com lixo, campos antigos, cor inválida e extras repetidos devolve os padrões certos. `DEFAULT_LOOK` desenha os mesmos quadros de hoje: o snapshot das 8 cenas não muda.
- **toCells:** célula cheia com 2 cores dá glifo com `bg`. Com 2 cores mais um furo, cai na maioria.
- **Rosto e chapéu, para todas as combinações:**
  - **Combinações:** olhos × silhueta × chapéu (com e sem) × cenas, em vários instantes.
  - **Rosto:** a linha do rosto bate com a referência de cada modo de olho (`▐▛███▜▌`, `▐▌███▐▌`, `▐▗███▖▌`, `▐▀███▀▌`, `▐▀▀▀▀▀▌`).
  - **Chapéu:** a linha do chapéu bate com a tabela da §4.5.
  - **Células:** nenhuma célula cai no caso de 3 estados.
- **Paletas:** a rampa em 100 e em 0 bate com as paradas, accents dentro do gamut e `dark: false` invertendo selos e trilhos.
- **Reações:**
  - **Prioridades:** susto vence aceno, e aceno vence cena.
  - **Fim do aceno:** acaba quando a ferramenta roda ou é negada.
  - **Subagents:** eventos de subagent (com `agent_id`) são ignorados.
- **Menu**, com o harness de UI (`ui.find`, `ui.press`, `ui.key`):
  - abrir `/boneco chapeu` começa no passo 4;
  - o atalho `3` salva `coroa` e avança;
  - o foco numa opção muda a prévia sem salvar;
  - hex inválido não salva;
  - Esc fecha.
- **paths:** `C:\Users\gian\proj` dá `proj`, `C:\a\b\c.ts` dá `b/c.ts` e `HOME` ausente cai em `USERPROFILE`.
- **`.ps1`:** sem pwsh nesta máquina, a verificação é manual. O plano descreve o passo: rodar com o JSON de exemplo do cabeçalho do `.sh` e comparar a saída com a do `.sh`.

## 10. Ordem de entrega

1. `look.ts` + `palettes.ts` + `gauges`/`identity` com paleta, sem mudança visual no padrão.
2. Mascote: célula bicolor, cores, olhos, silhuetas, chapéus e faixa de 4 linhas.
3. Reações e bichinho.
4. Menu `/boneco`.
5. Windows: `paths.ts`, `.ps1` e README.
6. README de personalização e GIFs novos.

Cada etapa termina com `claude plugin validate .` e `claude plugin test .` verdes.
