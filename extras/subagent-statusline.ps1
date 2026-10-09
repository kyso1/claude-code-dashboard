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
function Clean($v) {
  if ($null -eq $v) { return '' }
  if ($v -is [bool]) { return ([string]$v).ToLowerInvariant() }   # jq prints true, not True
  return ([string]$v) -replace '\p{Cc}', ''
}

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
# (not $e: PowerShell variables are case-insensitive, it would shadow $E, the ESC)
function Pips($effort) {
  if ($effort -isnot [bool] -and $effort -is [ValueType]) { return $LBL + (Num ([math]::Floor([double]$effort / 1000))) + 'k' + $OFF }
  $n = [array]::IndexOf($LEVELS, [string]$effort)
  if ($n -lt 0) { return $LBL + (Clean $effort) + $OFF }
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
