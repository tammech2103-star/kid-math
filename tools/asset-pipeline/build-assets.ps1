# Build all five asset skills and copy deliverables into Asset/v2.
# Run from anywhere: pwsh -File "D:\Kid Math\tools\asset-pipeline\build-assets.ps1"

$ErrorActionPreference = 'Stop'

$NODE = 'C:\Users\2103\AppData\Local\Temp\opencode\node\node-v22.18.0-win-x64\node.exe'
$SKILLS = 'C:\Users\2103\.config\opencode\ocgs\.agents\skills'
$PROJECT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$DSL = $PSScriptRoot
$V2 = Join-Path $PROJECT 'Asset\v2'
$MAX_BYTES = 400000

function Invoke-Skill {
    param([string] $Skill, [string[]] $Arguments, [string] $Label)

    $cli = Join-Path $SKILLS "$Skill\bin\$Skill.js"
    if (-not (Test-Path $cli)) { throw "Missing CLI: $cli" }
    Write-Host "==> $Label"
    & $NODE $cli @Arguments 2>&1 | ForEach-Object {
        $line = [string] $_
        Write-Host $line
        if ($Skill -eq 'loom' -and $line -cmatch '\bSEAM\b') {
            throw "Loom reported a seam: $line"
        }
        if ($line -cmatch '\bCLIPPED\b') { throw "Clipped audio: $line" }
    }
    if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE" }
}

function Copy-Glob {
    param([string] $From, [string] $To, [string] $Pattern)

    # A stale FILE at the destination path (e.g. an earlier flat copy named
    # "sfx"/"music") would make Copy-Item overwrite that file instead of
    # creating the folder. Remove leaf collisions before creating the dir.
    if (Test-Path -LiteralPath $To -PathType Leaf) { Remove-Item -LiteralPath $To -Force }
    New-Item -ItemType Directory -Force -Path $To | Out-Null
    $items = @(Get-ChildItem -Path $From -Filter $Pattern -File -ErrorAction SilentlyContinue)
    if ($items.Count -eq 0) { throw "No $Pattern files in $From" }
    foreach ($item in $items) { Copy-Item $item.FullName -Destination (Join-Path $To $item.Name) -Force }
}

foreach ($dir in @('pxl', 'vex', 'kiln', 'loom', 'chirp')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $V2 $dir) | Out-Null
}

# 1. pxl — 21 pixel sprites
$pxlBuild = Join-Path $V2 'pxl\_build'
Invoke-Skill 'pxl' @('build', (Join-Path $DSL 'pxl\items.px.js'), '--out', $pxlBuild) 'pxl build'
Invoke-Skill 'pxl' @('lint', (Join-Path $DSL 'pxl\items.px.js')) 'pxl lint'
Copy-Glob (Join-Path $pxlBuild 'sprites') (Join-Path $V2 'pxl') '*.png'

# 2. vex — 21 vector icons
$vexBuild = Join-Path $V2 'vex\_build'
Invoke-Skill 'vex' @('build', (Join-Path $DSL 'vex\ui.vx.js'), '--out', $vexBuild) 'vex build'
Copy-Glob (Join-Path $vexBuild 'sprites') (Join-Path $V2 'vex') '*.svg'

# 3. kiln — 6 low-poly props
$kilnBuild = Join-Path $V2 'kiln\_build'
Invoke-Skill 'kiln' @('build', (Join-Path $DSL 'kiln\props.kx.js'), '--out', $kilnBuild) 'kiln build'
Copy-Glob (Join-Path $kilnBuild 'models') (Join-Path $V2 'kiln') '*.glb'
# Static web consumes the rendered preview PNGs (<img src>); GLB is master-only.
Copy-Glob (Join-Path $kilnBuild '_preview') (Join-Path $V2 'kiln') '*.png'

# 4. loom — 6 seamless materials (albedo PNGs)
$loomBuild = Join-Path $V2 'loom\_build'
Invoke-Skill 'loom' @('build', (Join-Path $DSL 'loom\materials.tx.js'), '--out', $loomBuild) 'loom build'
foreach ($name in @('wood_grain', 'felt_cloth', 'paper_fiber', 'ink_wash', 'yarn_knit', 'patchwork_fabric')) {
    Copy-Glob (Join-Path $loomBuild $name) (Join-Path $V2 "loom\$name") "${name}_albedo.png"
}

# 5. chirp — 7 SFX, 1 loop, 1 bank (mono WAV; OGG needs ffmpeg, unavailable)
$chirpBuild = Join-Path $V2 'chirp\_build'
Invoke-Skill 'chirp' @('build', (Join-Path $DSL 'chirp\sounds.cx.js'), '--out', $chirpBuild, '--mono') 'chirp build'
foreach ($name in @('coin', 'correct', 'wrong', 'star', 'whoosh', 'pop', 'tap')) {
    Invoke-Skill 'chirp' @('info', (Join-Path $DSL 'chirp\sounds.cx.js'), $name) "chirp info $name"
}
Copy-Glob (Join-Path $chirpBuild 'sfx') (Join-Path $V2 'chirp\sfx') '*.wav'
Copy-Glob (Join-Path $chirpBuild 'music') (Join-Path $V2 'chirp\music') '*'
Copy-Glob $chirpBuild (Join-Path $V2 'chirp') 'game_sfx.*'

# Verify deliverables exist and respect the 400 KB budget.
$deliverables = @(Get-ChildItem -Path $V2 -Recurse -File |
    Where-Object { $_.FullName -notmatch '\\_build\\' -and $_.Extension -ne '.md' })
if ($deliverables.Count -lt 65) {
    throw "Expected at least 65 deliverables, found $($deliverables.Count)"
}
foreach ($file in $deliverables) {
    if ($file.Length -gt $MAX_BYTES) {
        throw "Over ${MAX_BYTES} bytes: $($file.FullName) ($($file.Length))"
    }
}
Write-Host "OK: $($deliverables.Count) deliverables, all <= ${MAX_BYTES} bytes."
