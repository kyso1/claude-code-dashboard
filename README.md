# claude-code-dashboard

Uma faixa viva acima do prompt do Claude Code: um mini Claude que encena o que o Claude está fazendo, quem está trabalhando (modelo, effort, plano) e medidores de contexto e de limite de uso que se atualizam em tempo real.

![A faixa durante um turno: o mini Claude pensa, cozinha enquanto o Bash roda, constrói enquanto edita um arquivo e comemora no fim](docs/hero.gif)

É um **mod**: um plugin de *function hooks* que roda dentro do Claude Code e desenha na interface a 30 quadros por segundo. Uma statusline comum não chega lá, porque o Claude Code redesenha a `statusLine` no máximo uma vez por segundo, e nenhuma animação fica fluida assim.

## O que tem na faixa

**O mini Claude.** É o bonequinho da tela de boas-vindas, desenhado em pixels de quadrante (2×2 por caractere). A cena muda conforme o que está acontecendo:

![As oito cenas do mini Claude](docs/scenes.gif)

| Cena | Quando aparece | Verbos do spinner que caem nela |
|---|---|---|
| cozinhando | `Bash` | Sautéing, Brewing, Baking, Simmering… |
| pensando | `Read` | Pondering, Musing, Cogitating… |
| construindo | `Edit`, `Write` | Forging, Crafting, Tinkering… |
| passeando | `Grep`, `Glob`, busca na web | Meandering, Moseying, Zigzagging… |
| fazendo mágica | `Agent`, `Skill`, workflows | Enchanting, Clauding, Levitating… |
| dançando | escrevendo a resposta | Moonwalking, Grooving, Vibing… |
| cultivando | listas de tarefas | Sprouting, Germinating, Hatching… |
| na ventania | ferramentas de MCP | Swirling, Gusting, Thundering… |

- **Os 189 verbos** que o Claude Code sorteia para o spinner estão distribuídos nessas oito cenas.
- **Durante a ferramenta**, a cena acompanha a ferramenta em uso. Entre uma e outra, volta para a do verbo do turno. Cada cena fica pelo menos 1,5 s na tela para não piscar.
- **Fora de trabalho**, ele pisca quando está à toa, dorme depois de 90 s parado e comemora quando o turno termina.
- **`/nome Kiko`** dá um nome a ele, e a legenda passa a dizer "Kiko está cozinhando".
- **`/boneco`** abre um menu para vestir o mini Claude e escolher as cores da faixa, uma parte por vez (veja abaixo).

**Quem está trabalhando.** Modelo, effort (com os mesmos pips coloridos dos medidores), pasta, branch e custo da sessão. Em plano Pro ou Max, o custo aparece como **"via API"** ao lado de um selo do plano: é quanto aquela sessão custaria pagando por token, e não o que você está pagando.

**Os medidores.** Contexto restante, limite de 5 horas e limite semanal, cada um com o horário de reset:

![Medidores de 96%, 58% e 9%, com o brilho passando](docs/gauges.gif)

- **Cor:** contínua, do verde (cheio) ao vermelho (vazio), calculada em OKLCH, então não há degraus nem faixas escuras no meio do caminho.
- **Precisão:** as barras preenchem com 1/8 de célula (`▏▎▍▌▋▊▉`).
- **Brilho:** atravessa os três medidores a cada 3 segundos.
- **Alerta:** abaixo de 15%, o medidor pulsa.

**Painel de subagents.** Um script de `subagentStatusLine` deixa as linhas do painel de agentes no mesmo estilo. Cada linha mostra:
- status animado;
- minigráfico de quantos tokens o agente gastou a cada atualização;
- contexto usado;
- tempo rodando;
- modelo e effort.

![Linhas do painel de subagents](docs/subagents.png)

## /boneco: personalize

`/boneco` abre um painel acima do prompt e passa por seis partes. A seta passa pelas opções e a prévia mostra cada uma animada. Enter (ou a tecla ao lado do nome) escolhe e segue para a próxima parte. A escolha fica salva e vale para as próximas sessões. Esc fecha o painel sem desfazer nada. Para abrir direto numa parte, use `/boneco chapeu` (ou `paleta`, `cor`, `olhos`, `silhueta`, `reacoes`).

| Parte | Opções |
|---|---|
| Paleta | Do /theme (o padrão), Clássico, Chamados, Catppuccin Mocha, Dracula, Tokyo Night, Nord, Gruvbox, Rosé Pine, Synthwave, Fósforo, Âmbar, Daltonismo (rampa azul → laranja), Papel (terminal claro) |
| Cor | da paleta, fixa (8 amostras ou qualquer hex), arco-íris, pelo modelo, pela cena, pelo contexto, pelo effort; e dois tons |
| Olhos | vazados, grandes, LED colorido, óculos escuros, visor; e bochechas |
| Silhueta | clássica, orelhinhas, cantos redondos, fantasminha |
| Chapéu | 14 chapéus, figurino por cena ou pelo calendário. Um chapéu põe 1 linha a mais na faixa. |
| Reações | susto quando uma ferramenta falha, aceno quando você responde a um pedido de permissão, suor com pouco contexto, ócio variado, bichinho |

![Chapéus, olhos e silhuetas](docs/looks.png)

![A faixa em cada paleta](docs/palettes.png)

## Instalação

Você precisa de:
- um Claude Code com suporte a mods (*plugins of function hooks*); testado na **2.1.295**, e a API ainda é de acesso antecipado;
- um terminal com **truecolor** e uma **Nerd Font**, para os ícones e as pontas arredondadas.

### Pelo marketplace

No prompt do Claude Code:

```
/plugin install dashboard --marketplace kyso1/claude-code-dashboard
```

Responda `y` para adicionar o marketplace e escolha o escopo de usuário.

### Pelo clone

```bash
git clone https://github.com/kyso1/claude-code-dashboard ~/.claude/mods/dashboard
```

Em `~/.claude/settings.json`:

```json
{
  "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/dashboard" }
}
```

A pasta fica vigiada, então editar um arquivo recarrega o mod na hora.

### Linhas de subagents (opcional)

```json
{
  "subagentStatusLine": { "type": "command", "command": "bash ~/.claude/mods/dashboard/extras/subagent-statusline.sh" }
}
```

Se instalou pelo marketplace, aponte para o `extras/subagent-statusline.sh` dentro da pasta do plugin. Precisa de `jq`. A faixa já mostra o que uma statusline costuma mostrar, então dá para remover a `statusLine` se você usar uma.

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

## Personalizar

| O quê | Onde |
|---|---|
| Velocidade, largura e pausa do brilho | `SPEED`, `RADIUS`, `PAUSE` em `hooks/gauges.ts` |
| Largura das barras e limite do pulso | `MAX_W`, `MIN_W`, `LOW` em `hooks/gauges.ts` |
| Tempo mínimo de cada cena | `HOLD_MS` em `hooks/clawd.ts` |
| Qual ferramenta vira qual cena | `TOOL_SCENES` em `hooks/clawd.ts` |
| Quadros por segundo | `FPS` em `hooks/register.tsx` |
| Paletas (cores, rampa dos medidores) | `PALETTES` em `hooks/palettes.ts` |
| Chapéus (pixel a pixel) | `HAT_PIXELS` em `hooks/wardrobe.ts` |
| Opções e textos do `/boneco` | `OPTIONS` em `hooks/menu.ts` |

O mini Claude e o selo do modelo usam a cor `claude` do seu [tema customizado](https://code.claude.com/docs/en/terminal-config#create-a-custom-theme), se ele definir uma. Sem isso, ficam no laranja do Claude.

## Como funciona

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

| Hook | Para quê |
|---|---|
| `ui.render` em `AbovePrompt` | desenha a faixa como um `Raster` (cada célula com glifo, cor de frente e de fundo) |
| `$.clock.every(33ms)` + `$.ui.blit` | repinta as células 30 vezes por segundo sem refazer a interface |
| `ui.render` em `Spinner` | lê o verbo e o modo do spinner, sem mudar o que ele desenha |
| `tool.call` | qual ferramenta está rodando e com qual argumento |
| `session.start`, `session.measure` | contexto, limites de 5h/7d e custo |
| `classic.Stop`, `classic.PostToolUse` | o effort em uso no turno |
| `prompt.submit`, `turn.complete` | começo e fim do turno |
| `command.run` | o `/nome`, salvo em `$.store` entre sessões |
| `classic.PostToolUseFailure`, `classic.PermissionRequest`, `classic.PermissionDenied` | as reações do `/boneco` |
| `command.run` (`boneco`), `ui.render` em `Pane`, `ui.focus`, `ui.close` | o painel do `/boneco` e sua prévia |

O plano vem de `~/.claude.json` (`oauthAccount.organizationType`). O mod não lê o arquivo de credenciais.

Três armadilhas que custaram tempo:
- **Sprite fora da grade:** um sprite em pixels de quadrante só pode andar de célula inteira em célula inteira. Um pixel fora da grade e os quadrantes se recombinam numa mancha torta.
- **Verbo do turno:** o verbo do spinner é sorteado uma vez por turno. Por isso a cena segue a ferramenta, senão um turno longo teria uma animação só.
- **Onde passar `$`:** a validação dos mods só aceita passar `$` para funções declaradas no topo do arquivo.

## Desenvolvimento

```bash
claude plugin validate .
claude plugin test .          # 63 testes: cenas, rosto alinhado, rampa de cor, brilho, legenda…
bash extras/check-ps1.sh   # o .ps1 imprime o mesmo que o .sh (precisa de pwsh e jq)
```

As imagens deste README saem do próprio código do mod. `docs/render.mts` desenha as grades de células num canvas e monta os GIFs com ffmpeg:

```bash
PLAYWRIGHT_FROM=/caminho/de/um/projeto/com/playwright/package.json npx -y tsx docs/render.mts docs
```

## Licença

MIT
