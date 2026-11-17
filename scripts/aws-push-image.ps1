# Envia a imagem da API para o ECR a partir do seu computador (usado no primeiro deploy,
# antes de configurar o GitHub; depois o workflow "Deploy API" faz isso sozinho).
#
# Uso (na pasta do projeto, com o Docker Desktop aberto):  .\scripts\aws-push-image.ps1
param([string]$Environment = "staging")
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Push-Location (Join-Path $root "infra\terraform")
try {
  $repo = terraform output -raw ecr_repository_url
  $vars = terraform output -json github_variables | ConvertFrom-Json
} finally { Pop-Location }
$region = $vars.AWS_REGION
$registry = $repo.Split('/')[0]

Write-Host "Login no ECR ($registry)..." -ForegroundColor Magenta
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $registry
if ($LASTEXITCODE -ne 0) { throw "Falhou o login no ECR." }

Write-Host "Montando a imagem (a primeira vez demora alguns minutos)..." -ForegroundColor Magenta
docker build -t "${repo}:latest" (Join-Path $root "backend")
if ($LASTEXITCODE -ne 0) { throw "Falhou o docker build." }
docker push "${repo}:latest"
if ($LASTEXITCODE -ne 0) { throw "Falhou o docker push." }

Write-Host "Atualizando a API..." -ForegroundColor Magenta
aws ecs update-service --region $region --cluster $vars.ECS_CLUSTER --service $vars.ECS_SERVICE --force-new-deployment | Out-Null
Write-Host "Esperando a versao nova ficar saudavel (2 a 5 min)..."
aws ecs wait services-stable --region $region --cluster $vars.ECS_CLUSTER --services $vars.ECS_SERVICE
Push-Location (Join-Path $root "infra\terraform")
$api = terraform output -raw api_url
Pop-Location
Write-Host "No ar! Teste: $api/actuator/health" -ForegroundColor Green
