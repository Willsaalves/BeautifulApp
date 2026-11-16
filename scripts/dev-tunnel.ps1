# Sobe tudo para testar de fora da rede (modo C), sem copiar URL na mao:
#   1. banco e storage (docker compose)
#   2. tuneis do Cloudflare para a API (8080) e as fotos (9090)
#   3. grava a URL da API em mobile\.env.local
#   4. abre a API numa janela nova, ja com a URL das fotos
#   5. roda o Expo com --tunnel nesta janela
# Ctrl+C no Expo encerra os tuneis e a API.
#
# Uso (na pasta do projeto):
#   .\dev-tunnel.cmd
# ou
#   powershell -ExecutionPolicy Bypass -File .\scripts\dev-tunnel.ps1
#
# Opcoes:
#   -SemExpo      sobe so backend + tuneis (util se o Expo ja estiver aberto)
#   -SemDocker    nao roda docker compose (se o banco ja estiver no ar)

param(
  [switch]$SemExpo,
  [switch]$SemDocker
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$mobile = Join-Path $root 'mobile'
$logs = Join-Path $root '.tunnel-logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Write-Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Magenta }

foreach ($cmd in @('cloudflared', 'docker', 'npx')) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "Nao encontrei '$cmd' no PATH. Instale (veja docs\COMO-RODAR.md) e abra um PowerShell novo."
  }
}

# Encerra tuneis e API que sobraram de uma execucao anterior
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$old = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($old) {
  Write-Step "Encerrando a API antiga que estava na porta 8080"
  $old | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
}

if (-not $SemDocker) {
  Write-Step "Subindo banco e storage (docker compose)"
  Push-Location $backend
  try { docker compose up -d } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw "docker compose falhou. O Docker Desktop esta aberto e com 'Engine running'?" }
}

function Start-Tunnel([int]$port, [string]$name) {
  $out = Join-Path $logs "$name.out.log"
  $err = Join-Path $logs "$name.err.log"
  Remove-Item $out, $err -ErrorAction SilentlyContinue
  $p = Start-Process cloudflared -ArgumentList @('tunnel', '--no-autoupdate', '--url', "http://localhost:$port") `
    -RedirectStandardOutput $out -RedirectStandardError $err -WindowStyle Hidden -PassThru
  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 500
    if ($p.HasExited) { throw "O cloudflared do tunel '$name' fechou. Veja $err" }
    $text = (Get-Content $err, $out -Raw -ErrorAction SilentlyContinue) -join "`n"
    $m = [regex]::Match($text, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($m.Success) { return @{ Url = $m.Value; Process = $p } }
  }
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  throw "Nao recebi a URL do tunel '$name' em 60s. Veja $err"
}

Write-Step "Abrindo tuneis do Cloudflare"
$api = Start-Tunnel 8080 'api'
$fotos = Start-Tunnel 9090 'fotos'
Write-Host "   API:   $($api.Url)" -ForegroundColor Green
Write-Host "   Fotos: $($fotos.Url)" -ForegroundColor Green

# .env.local do app (ASCII: o PowerShell 5 colocaria BOM com UTF8 e o Expo nao leria a variavel)
$envFile = Join-Path $mobile '.env.local'
Set-Content -Path $envFile -Value "EXPO_PUBLIC_API_URL=$($api.Url)" -Encoding ascii
Write-Host "   Gravado em mobile\.env.local" -ForegroundColor Green

Write-Step "Subindo a API numa janela nova"
$env:APP_MEDIA_ENDPOINT = $fotos.Url
$env:APP_MEDIA_PUBLIC_URL = "$($fotos.Url)/beautifulapp"
$apiWindow = Start-Process powershell -WorkingDirectory $backend -PassThru `
  -ArgumentList @('-NoExit', '-Command', '.\gradlew.bat bootRun')

Write-Host "   Esperando a API responder..." -NoNewline
$up = $false
$deadline = (Get-Date).AddMinutes(4)
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/actuator/health' -TimeoutSec 3
    if ($r.status -eq 'UP') { $up = $true; break }
  } catch { }
  Write-Host "." -NoNewline
  Start-Sleep -Seconds 3
}
Write-Host ""
if ($up) {
  Write-Host "   API no ar. Teste no celular: $($api.Url)/actuator/health" -ForegroundColor Green
} else {
  Write-Host "   A API ainda nao respondeu. Veja a janela dela (pode ser so lentidao no primeiro build)." -ForegroundColor Yellow
}

function Stop-All {
  Write-Step "Encerrando tuneis e API"
  foreach ($p in @($api.Process, $fotos.Process)) {
    if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
  }
  if ($apiWindow -and -not $apiWindow.HasExited) {
    # /T derruba a janela e o Java que ela abriu
    taskkill /PID $apiWindow.Id /T /F | Out-Null
  }
}

if ($SemExpo) {
  Write-Host ""
  Write-Host "Pronto. Agora rode o Expo com: cd mobile ; npx expo start --tunnel -c" -ForegroundColor Cyan
  Write-Host "Pressione Enter aqui para encerrar os tuneis e a API."
  Read-Host | Out-Null
  Stop-All
  return
}

Write-Step "Abrindo o Expo (leia o QR code com o Expo Go). Ctrl+C encerra tudo."
Push-Location $mobile
try {
  npx expo start --tunnel -c
} finally {
  Pop-Location
  Stop-All
}
