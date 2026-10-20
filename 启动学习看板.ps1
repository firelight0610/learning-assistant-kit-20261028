$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$runtime_root = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node'
$node_command = Get-Command node -ErrorAction SilentlyContinue
$pnpm_command = Get-Command pnpm -ErrorAction SilentlyContinue
$bundled_pnpm = Join-Path $runtime_root 'node_modules/pnpm/bin/pnpm.cjs'
if (-not $node_command) {
    throw '未找到 Node.js，请先安装 Node.js 24，再重新打开终端。'
}
if (-not (Test-Path -LiteralPath 'node_modules/@netlify/database')) {
    if ($pnpm_command) { & $pnpm_command.Source install --frozen-lockfile }
    elseif (Test-Path -LiteralPath $bundled_pnpm) { & $node_command.Source $bundled_pnpm install --frozen-lockfile }
    else { throw '未找到 pnpm，请安装 pnpm 11.25.0 后重试。' }
    if ($LASTEXITCODE -ne 0) { throw '依赖安装失败，请保留报错信息。' }
}
Write-Host '启动后打开 http://127.0.0.1:8888；按 Ctrl+C 结束。'
& $node_command.Source scripts/dev.mjs
