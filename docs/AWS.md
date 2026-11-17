# Subindo o BeautifulApp na AWS

Tudo é criado pelo Terraform (`infra/terraform`). Você roda os comandos uma vez. Depois disso, cada push na `main` que mexer no backend faz o deploy sozinho pelo GitHub.

## O que é criado

```
App (celular)
  │ HTTPS
  ├──> CloudFront (api)    ──> Balanceador (ALB) ──> API no ECS Fargate ──> Postgres (RDS, rede privada)
  │                                                       ├──> S3 (fotos e comprovantes)
  │                                                       └──> SQS (eventos, com fila de erros)
  └──> CloudFront (mídia)  ──> S3 (só fotos públicas)
```

| Peça | Para quê |
|---|---|
| **CloudFront** | HTTPS com endereço `https://xxxx.cloudfront.net`, sem precisar comprar domínio |
| **ALB** | Distribui as requisições e só aceita tráfego vindo do CloudFront |
| **ECS Fargate** | Roda a API em container, sem servidor para administrar. Se uma versão nova não subir, volta para a anterior sozinho |
| **RDS Postgres 16** | Banco com backup diário (7 dias), criptografado e sem acesso pela internet |
| **S3** | Fotos (públicas pelo CloudFront) e comprovantes (privados, link temporário) |
| **SQS** | Filas dos eventos (outbox), cada uma com fila de mensagens com erro |
| **Secrets Manager** | Senha do banco, chaves do login e pepper do OTP. Nada disso fica no código |
| **ECR** | Imagens da API |
| **Budget** | E-mail quando o gasto passar de 80% do limite |

**Escolhas para economizar:** não há NAT Gateway (que custaria cerca de US$ 32/mês), o banco usa uma instância pequena e roda uma cópia da API.

### Custo aproximado do staging (por mês)

| Item | sa-east-1 (São Paulo) | us-east-1 (Virgínia) |
|---|---|---|
| API (Fargate 0,5 vCPU / 1 GB) | ~US$ 25 | ~US$ 18 |
| Balanceador (ALB) | ~US$ 22 | ~US$ 18 |
| Postgres (db.t4g.micro + 20 GB) | ~US$ 25 | ~US$ 15 |
| IPs públicos (3) | ~US$ 11 | ~US$ 11 |
| CloudFront, S3, SQS, Secrets, logs, ECR | ~US$ 5 | ~US$ 5 |
| **Total** | **~US$ 85–90** | **~US$ 65** |

Os valores são de referência: confira na [calculadora da AWS](https://calculator.aws). Contas novas costumam receber créditos.

Para economizar quando ninguém estiver testando, veja [Desligar para economizar](#desligar-para-economizar).

---

## 1. Conta e acesso (uma vez)

1. Crie a conta em https://aws.amazon.com.
2. **Proteja o usuário raiz.** Entre com ele, ative o **MFA** (menu da conta → Security credentials) e não use mais esse usuário no dia a dia.
3. **Crie seu usuário de trabalho** com o IAM Identity Center:
   - Console → **IAM Identity Center** → Enable.
   - **Users** → Add user (seu e-mail).
   - **Permission sets** → Create → *Predefined* → **AdministratorAccess**.
   - **AWS accounts** → selecione a conta → Assign users → seu usuário + AdministratorAccess.
   - Anote o **AWS access portal URL**, algo como `https://d-xxxx.awsapps.com/start`.
4. Ative o MFA nesse usuário quando o portal pedir.

## 2. Ferramentas no Windows (uma vez)

```powershell
winget install Amazon.AWSCLI
winget install Hashicorp.Terraform
```
Feche e abra o PowerShell, e confira com `aws --version` e `terraform -version` (precisa ser 1.10 ou mais nova). O Docker Desktop você já tem.

## 3. Login da AWS no terminal

```powershell
aws configure sso
```
Responda assim:
- **SSO session name:** `beautifulapp`
- **SSO start URL:** o access portal URL do passo 1
- **SSO region:** a região onde você ativou o Identity Center (ex.: `sa-east-1`)
- **CLI default client Region:** `sa-east-1`
- **Profile name:** `beautifulapp`

Em todo terminal novo:
```powershell
$env:AWS_PROFILE="beautifulapp"
aws sso login          # quando a sessão expirar
aws sts get-caller-identity   # confere: mostra sua conta
```

## 4. Preparar o estado do Terraform (uma vez)

O Terraform guarda o que criou num bucket S3. O script cria esse bucket:
```powershell
cd C:\dev\BeautifulApp
.\scripts\aws-bootstrap.ps1 -Region sa-east-1
```
No fim, ele mostra o comando `terraform init` com o nome do bucket. Guarde esse comando.

## 5. Configurar o ambiente

Abra `infra\terraform\environments\staging.tfvars` e confira:
- **`region`:** `sa-east-1` (São Paulo) ou `us-east-1` (cerca de 30% mais barato, mas com mais latência).
- **`alert_email`:** seu e-mail, para receber o alerta de custo.
- **`otp_fixed_code = "123456"`:** enquanto o login por SMS/WhatsApp não existe, o staging aceita esse código. **Qualquer pessoa entra em qualquer número**, então só passe a URL para quem for testar.

## 6. Criar a infraestrutura

```powershell
cd infra\terraform
terraform init -backend-config="bucket=beautifulapp-tfstate-SUA_CONTA" -backend-config="key=staging/terraform.tfstate" -backend-config="region=sa-east-1"
terraform plan -var-file="environments/staging.tfvars"
terraform apply -var-file="environments/staging.tfvars"
```
O `plan` mostra o que será criado, umas 60 peças. O `apply` pede confirmação (`yes`) e leva de **10 a 20 minutos**; o CloudFront é a parte mais lenta.

No fim aparecem os **outputs**. Os principais:
- `api_url`: endereço da API, ex.: `https://d1abc.cloudfront.net`.
- `privacy_policy_url`: a URL que as lojas pedem.
- `github_variables`: para o passo 8.

Neste momento a API ainda não sobe, porque não existe imagem no ECR. É normal; o próximo passo resolve.

## 7. Primeiro deploy (do seu computador)

Com o Docker Desktop aberto:
```powershell
cd C:\dev\BeautifulApp
.\scripts\aws-push-image.ps1
```
O script monta a imagem, envia para o ECR, atualiza a API e espera ela ficar saudável. A primeira subida roda as migrações do banco.

Para testar, abra no navegador:
- `API_URL/actuator/health` → `{"status":"UP"}`
- `API_URL/legal/privacidade` → a Política de Privacidade

Para usar no app:
```powershell
cd mobile
Set-Content .env.local "EXPO_PUBLIC_API_URL=API_URL"
npx expo start -c
```
Não precisa mais de túnel: a API está na internet, com HTTPS.

Para ter dados de teste no staging:
```powershell
node scripts\seed-demo.mjs --api API_URL
```

## 8. Deploy automático pelo GitHub

1. No GitHub: **Settings → Environments → New environment → `staging`**.
2. Dentro dele, em **Environment variables**, cadastre os 5 valores do output `github_variables`: `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`, `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE`.
3. Pronto. Agora:
   - todo push na `main` que mexa em `backend/` publica a versão nova;
   - para publicar na mão: **Actions → Deploy API → Run workflow**.

O GitHub entra na AWS por **OIDC**: nenhuma chave da AWS fica guardada no GitHub. O papel só tem permissão para enviar imagem e atualizar a API, e só vale para este repositório.

---

## Dia a dia

**Ver os logs da API:**
```powershell
aws logs tail /ecs/beautifulapp-staging-api --follow
```

**Consultar o banco** (ex.: revisar denúncias): o banco não tem acesso pela internet, então use o **CloudShell** dentro da rede da AWS.
1. Console → CloudShell → Actions → **Create VPC environment**.
2. Escolha a VPC `beautifulapp-staging`, uma das `private_subnet_ids` e o grupo `admin_security_group_id` (ambos estão nos outputs).
3. Pegue a senha no Secrets Manager (output `database_secret_arn`) e rode:
   ```bash
   psql "host=ENDPOINT_DO_BANCO dbname=beautifulapp user=beautifulapp sslmode=require"
   ```

**Ver as filas:** Console → SQS. As filas `*-dlq` guardam as mensagens que falharam 5 vezes.

### Desligar para economizar

- **Desligar a API:** no `staging.tfvars`, `api_desired_count = 0`, depois `terraform apply`.
- **Parar o banco por até 7 dias:** `aws rds stop-db-instance --db-instance-identifier beautifulapp-staging` (ele religa sozinho depois de 7 dias).
- **Apagar tudo:** `terraform destroy -var-file="environments/staging.tfvars"`. Os dados do banco do staging são perdidos.

### Produção

Use `environments/prod.tfvars`, com outro `key` no `terraform init` (ex.: `prod/terraform.tfstate`) e um environment `prod` no GitHub. Antes, falta:
- **Login por SMS/WhatsApp:** em produção não existe código fixo.
- **Domínio próprio** (ex.: `api.beautifulapp.com.br`) com certificado no ALB, para o trecho CloudFront → ALB também ser HTTPS.
- **Revisão** das peças de produção: 2 cópias da API, banco maior e proteção contra exclusão. O `prod.tfvars` já vem assim.

## Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| `The SSO session has expired` | `aws sso login` |
| `terraform init` reclama do backend | Confira o nome do bucket que o `aws-bootstrap.ps1` mostrou |
| `EntityAlreadyExists ... oidc-provider` | A conta já tem o provedor do GitHub: no tfvars, `create_github_oidc_provider = false` |
| API não fica saudável | `aws logs tail /ecs/beautifulapp-staging-api --since 15m`. Na primeira subida, as migrações levam alguns segundos |
| App: "Sem conexão com o servidor" | Confira o `.env.local` e reinicie com `npx expo start -c` |
| Foto não aparece | As fotos vêm do `media_url`. Se a API foi criada antes do CloudFront de mídia, rode o `apply` de novo |
| Gasto maior que o esperado | Console → Billing → Cost Explorer, agrupado por serviço |
