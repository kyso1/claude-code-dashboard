#!/usr/bin/env bash
# Claude Code subagentStatusLine: one row per subagent in the agent panel
# (Workflow agents included). Same palette as statusline.sh.
#
#   ⠹ Explore         find auth callers…   ▁▂▅▇▃▂▁▁ 45.2k  23% │ 1m23s │ sonnet ▰▰▰▱▱
#
# Input (claude 2.1.29x): {columns, tasks:[{id,name?,agentType,status,label,
# description,startTime(ms),model?,effort?,contextWindowSize?,tokenCount,
# tokenSamples[]}]}. Output: one {"id","content"} JSON line per row.

exec jq -c '
  def fg(r; g; b): "\u001b[38;2;\(r);\(g);\(b)m";
  def off: "\u001b[0m";
  def dim: fg(70; 72; 86);
  def lbl: fg(140; 145; 170);
  def pad(n): if n > 0 then " " * n else "" end;   # jq: " " * 0 is null
  def vis: gsub("\u001b\\[[0-9;]*m"; "") | length;
  def fit(w): if w <= 0 then "" elif length > w then .[0:w-1] + "…" else . + pad(w - length) end;
  def rfit(w): pad(w - length) + .;
  def two: tostring | if length < 2 then "0" + . else . end;

  def ktok: if . >= 1e6 then "\(. / 1e5 | floor / 10)M"
            elif . >= 1000 then "\(. / 100 | floor / 10)k"
            else tostring end;
  def dur: floor | if . < 60 then "\(.)s"
                   elif . < 3600 then "\(. / 60 | floor)m\(. % 60 | two)s"
                   else "\(. / 3600 | floor)h\(. % 3600 / 60 | floor | two)m" end;

  # token growth per tick as a sparkline; bar height also ramps the color
  def spark(w):
    ["▁","▂","▃","▄","▅","▆","▇","█"] as $ch
    | [range(1; length) as $i | .[$i] - .[$i - 1] | if . < 0 then 0 else . end] | .[-w:]
    | (max // 0) as $mx
    | (dim + ("▁" * (w - length) // "")) +
      (map(if $mx > 0 then (. * 7 / $mx | round) else 0 end
           | fg(90 + . * 4; 110 + . * 15; 170 + . * 12) + $ch[.]) | join(""))
    + off;

  # same continuous OKLCH ramp as statusline.sh EFF_RGB: green (low/full) -> red
  def stops: [[117,223,143],[176,198,60],[221,164,0],[246,125,0],[247,92,97]];
  def effort_pips:
    ["low","medium","high","xhigh","max"] as $lv
    | if type == "number" then lbl + "\(. / 1000 | floor)k" + off
      else (. as $e | $lv | index($e)) as $n
        | if $n == null then lbl + tostring + off
          else [range(5) | if . <= $n then fg(stops[.][0]; stops[.][1]; stops[.][2]) + "▰" else dim + "▱" end]
               | join("") + off end
      end;

  # pct left -> color between the ramp stops, 100 = green, 0 = red
  def fuel($left):
    (4 * (1 - ([[$left, 100] | min, 0] | max) / 100)) as $i
    | ([$i | floor, 3] | min) as $j | ($i - $j) as $f
    | [range(3) as $c | stops[$j][$c] + (stops[$j + 1][$c] - stops[$j][$c]) * $f | round]
    | fg(.[0]; .[1]; .[2]);

  (.columns // 100) as $cols
  | (now) as $now
  | .tasks[]
  | . as $t
  | ($t.status == "running") as $run
  | ((if $run then fg(120; 200; 255) + ("⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"[($now | floor) % 10:][0:1])
     elif $t.status == "completed" then fg(117; 223; 143) + "✓"
     elif $t.status == "failed" then fg(247; 92; 97) + "✗"
     elif $t.status == "killed" then dim + "⊘"
     else lbl + "•" end) + off) as $icon
  | ($t.name // $t.agentType // "agent") as $title
  | "\($icon) \(fg(200; 170; 255))\u001b[1m\($title | fit(16))\(off)" as $left

  # fixed-width fields so the columns line up across rows
  | ($t.tokenCount // 0) as $tok
  | (if $t.contextWindowSize then [$tok * 100 / $t.contextWindowSize | round, 100] | min else null end) as $used
  | (lbl + ($tok | ktok | rfit(6)) + off) as $toks
  | (if $used then " " + fuel(100 - $used) + ("\($used)%" | rfit(4)) + off else pad(5) end) as $ctx
  | (lbl + ((($now * 1000 - ($t.startTime // ($now * 1000))) / 1000) | dur | rfit(6)) + off) as $age
  | (($t.model // "" | capture("claude-(?<f>[a-z]+)").f) // $t.model // "") as $model
  | (fg(120; 200; 255) + ($model | fit(6)) + off) as $mdl
  | ($t.effort // null | if . == null then "" else effort_pips end | . + pad(5 - vis)) as $eff
  | (($t.tokenSamples // []) | spark(8)) as $spark
  | (dim + " │ " + off) as $sep

  | "\($spark) \($toks)\($ctx)\($sep)\($age)\($sep)\($mdl) \($eff)" as $full
  | "\($toks)\($sep)\($age)" as $compact
  | (if $cols - ($left | vis) - ($full | vis) - 2 >= 10 then $full else $compact end) as $right
  | ($cols - ($left | vis) - ($right | vis) - 2) as $room
  | (if $run then fg(205; 208; 222) else lbl end) as $lc
  | ($t.label // $t.description // "" | gsub("\\s+"; " ")) as $label
  | { id: $t.id,
      content: "\($left) \($lc)\($label | fit($room))\(off) \($right)" }
'
