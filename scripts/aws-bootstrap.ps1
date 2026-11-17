# Prepara a conta AWS para o Terraform (rodar UMA vez por conta):
# cria o bucket que guarda o estado do Terraform (versionado, criptografado e privado).
#
# Uso:  .\scripts\aws-bootstrap.ps1 -Region sa-east-1
param(
  [string]$Region = "sa-east-1",
  [string]$Project = "beautifulapp"
)
$ErrorActionPreference = 'Stop'

$account = (aws sts get-caller-identity --query Account --output text)
if (-not $account) { throw "Nao consegui falar com a AWS. Rode 'aws sso login' (ou 'aws configure') antes." }
$bucket = "$Project-tfstate-$account"
Write-Host "Conta $account - regiao $Region - bucket $bucket" -ForegroundColor Magenta

$exists = $true
try { aws s3api head-bucket --bucket $bucket 2>$null | Out-Null; if ($LASTEXITCODE -ne 0) { $exists = $false } } catch { $exists = $false }
if (-not $exists) {
  if ($Region -eq "us-east-1") { aws s3api create-bucket --bucket $bucket --region $Region | Out-Null }
  else { aws s3api create-bucket --bucket $bucket --region $Region --create-bucket-configuration "LocationConstraint=$Region" | Out-Null }
  Write-Host "Bucket criado." -ForegroundColor Green
} else {
  Write-Host "Bucket ja existe." -ForegroundColor Green
}
aws s3api put-bucket-versioning --bucket $bucket --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket $bucket --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

Write-Host ""
Write-Host "Pronto. Agora, na pasta infra\terraform:" -ForegroundColor Cyan
Write-Host "  terraform init -backend-config=`"bucket=$bucket`" -backend-config=`"key=staging/terraform.tfstate`" -backend-config=`"region=$Region`""
