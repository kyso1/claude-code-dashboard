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
