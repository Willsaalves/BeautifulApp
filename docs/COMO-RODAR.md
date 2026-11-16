# Como rodar o BeautifulApp (Windows / PowerShell)

Há três formas de rodar:

| Modo | Quando usar | O celular precisa estar… |
|---|---|---|
| **A. Só o app (protótipo)** | Ver o visual com dados de exemplo | Em qualquer rede (`--tunnel`) |
| **B. App + backend na mesma rede** | Testar login/cadastro reais em casa ou no escritório | No mesmo Wi‑Fi do computador |
| **C. App + backend com túnel** | Testar de qualquer lugar (4G, outra cidade) | Em qualquer rede |

---

## 0. Preparar o computador (uma vez só)

| Programa | Como instalar | Como conferir |
|---|---|---|
| Git | `winget install Git.Git` | `git --version` |
| Node.js 22 | `winget install OpenJS.NodeJS.LTS` | `node -v` |
| Java 21 | `winget install EclipseAdoptium.Temurin.21.JDK` | `java -version` (21.x) |
| Docker Desktop | `winget install Docker.DockerDesktop` | `docker version` (precisa mostrar **Server**) |
| cloudflared (modo C) | `winget install Cloudflare.cloudflared` | `cloudflared --version` |
| Expo Go (celular) | App Store / Play Store | — |

> Depois de instalar, **feche e abra o PowerShell** para os programas entrarem no PATH.
> Se `java -version` não funcionar, configure o `JAVA_HOME` apontando para a pasta do JDK 21.

## 1. Baixar / atualizar o código

```powershell
git clone https://github.com/Willsaalves/BeautifulApp.git   # só na primeira vez
cd BeautifulApp
git checkout claude/confident-babbage-ynfils
git pull
cd mobile
npm install
cd ..
```

> Sempre rode `git pull` **antes** de `npm install`, para evitar conflito no `package-lock.json`.

---

## Modo A — só o app, com dados de exemplo

```powershell
cd mobile
Remove-Item .env.local -ErrorAction SilentlyContinue   # garante que não aponta para API
npx expo start --tunnel -c
```

Leia o QR code com o Expo Go. Na primeira vez o Expo pede para instalar o `@expo/ngrok`: responda **Y**.

Login de teste: **(11) 99999-0000** (cliente) ou **(11) 98765-4321** (profissional), com qualquer código de 6 dígitos.

---

## Modo B — app + backend na mesma rede Wi‑Fi

### B1. Descobrir o IP do computador
```powershell
ipconfig
```
Use o **Endereço IPv4** do adaptador Wi‑Fi, ex: `192.168.0.10`. Nos comandos abaixo, troque `SEU_IP` por ele.

### B2. Liberar as portas no Firewall (uma vez, PowerShell **como administrador**)
```powershell
New-NetFirewallRule -DisplayName "BeautifulApp API" -Direction Inbound -Protocol TCP -LocalPort 8080,9090,8081 -Action Allow
```

### B3. Terminal 1: banco, storage e API
Abra o Docker Desktop e espere aparecer **"Engine running"**.
```powershell
cd backend
docker compose up -d
$env:APP_MEDIA_ENDPOINT="http://SEU_IP:9090"
$env:APP_MEDIA_PUBLIC_URL="http://SEU_IP:9090/beautifulapp"
.\gradlew.bat bootRun
```
Espere aparecer `Started BeautifulApplication`. Para testar, abra no navegador do celular: `http://SEU_IP:8080/actuator/health` → deve responder `"UP"`.

### B4. Terminal 2: app
```powershell
cd mobile
Set-Content .env.local "EXPO_PUBLIC_API_URL=http://SEU_IP:8080"
npx expo start -c
```
Leia o QR code com o Expo Go (celular no mesmo Wi‑Fi).

**Código de login no ambiente de testes: `123456`.** Ele também aparece no log da API como `[OTP DEV]`.

---

## Modo C — app + backend por túnel (acesso de fora da rede)

O túnel do Expo só leva o **app** até o celular. A API (8080) e o storage de fotos (9090) precisam dos túneis deles, e o Cloudflare cria esses túneis de graça.

### Jeito rápido: um comando só

Com o Docker Desktop aberto, na pasta do projeto:
```powershell
.\dev-tunnel.cmd
```
O script faz os passos C1 a C5 sozinho:
- sobe o banco e o storage;
- abre os dois túneis do Cloudflare e lê as URLs novas;
- grava a URL da API no `mobile\.env.local`;
- abre a API numa janela nova, já apontando as fotos para o túnel;
- espera a API responder e roda o Expo com `--tunnel -c`.

**Ctrl + C** no Expo fecha os túneis e a API. Toda vez que você mudar o backend, rode `.\dev-tunnel.cmd` de novo: ele encerra a API antiga e os túneis antigos e grava as URLs novas.

| Opção | Para quê |
|---|---|
| `.\dev-tunnel.cmd -SemExpo` | Sobe só backend e túneis (o Expo você abre em outro terminal) |
| `.\dev-tunnel.cmd -SemDocker` | Pula o `docker compose up` (banco já no ar) |

Se algo falhar, os logs dos túneis ficam em `.tunnel-logs\`. Os passos abaixo são o mesmo processo feito à mão.

### C1. Terminal 1: banco e storage
```powershell
cd backend
docker compose up -d
```

### C2. Terminal 2: túnel da API
```powershell
cloudflared tunnel --url http://localhost:8080
```
Anote a URL que aparece no quadro, ex: `https://aaaa-bbbb.trycloudflare.com` → **URL_API**.

### C3. Terminal 3: túnel das fotos
```powershell
cloudflared tunnel --url http://localhost:9090
```
Anote a URL → **URL_FOTOS**.

### C4. Terminal 4: API
```powershell
cd backend
$env:APP_MEDIA_ENDPOINT="URL_FOTOS"
$env:APP_MEDIA_PUBLIC_URL="URL_FOTOS/beautifulapp"
.\gradlew.bat bootRun
```
Teste no navegador: `URL_API/actuator/health` → `"UP"`.

### C5. Terminal 5: app
```powershell
cd mobile
Set-Content .env.local "EXPO_PUBLIC_API_URL=URL_API"
npx expo start --tunnel -c
```
Leia o QR code com o Expo Go, de qualquer rede.

> As URLs `trycloudflare.com` **mudam toda vez** que você roda o `cloudflared`. Quando mudarem, atualize o `.env.local` e as variáveis da API, e reinicie as duas coisas.

---

## Dados de teste: profissionais de todos os nichos

Com a API rodando (modo B ou C), em outro terminal na pasta do projeto:
```powershell
.\seed-demo.cmd
```
O script leva uns 2 minutos e cria **24 profissionais** (4 de cada nicho: unha, cílios, sobrancelha, estética, cabelo e depilação), espalhadas por 12 bairros de São Paulo. Cada profissional vem com:
- foto, capa, bio e chave Pix;
- 3 serviços (alguns com opções de formato, tamanho ou efeito);
- expediente de segunda a sábado;
- página completa: capa, contagem regressiva, Trending Designs, porcentagem, portfólio com 6 fotos, "sobre mim", fidelidade e depoimentos;
- estoque com baixa automática e 2 stories;
- 3 atendimentos concluídos e avaliados, 1 confirmado e 1 com comprovante para conferir.

Ele também cria **8 clientes**, com favoritas e stories.

Login no app com o código **123456**:

| Quem | Telefones |
|---|---|
| Clientes | (11) 95556-1001 até 95556-1008 |
| Nail designer | (11) 95555-1001 até 95555-1004 |
| Lash designer | (11) 95555-2001 até 95555-2004 |
| Sobrancelha | (11) 95555-3001 até 95555-3004 |
| Esteticista | (11) 95555-4001 até 95555-4004 |
| Cabeleireira | (11) 95555-5001 até 95555-5004 |
| Depiladora | (11) 95555-6001 até 95555-6004 |

Opções: `.\seed-demo.cmd --por-nicho 8 --clientes 12` (mais contas) ou `--api URL_API` (outra API).
Rodar de novo é seguro: as contas que já existem são puladas. Para começar do zero, rode `docker compose down -v` na pasta `backend`, suba tudo de novo e rode o seed.

> As imagens são desenhadas pelo próprio script (degradês com unhas, cílios, lábios…), sem precisar de internet.
> Os telefones são de teste e funcionam porque o código fixo 123456 só existe no ambiente de desenvolvimento.

## Notificações push (opcional)

A caixa de notificações (sino) funciona sempre. Para o **push** chegar no celular:

1. Crie o projeto no EAS (uma vez): `cd mobile` e `npx eas-cli@latest init`. Isso grava o `projectId` no `app.json`.
2. Suba a API com `$env:APP_PUSH_SENDER="expo"` antes do `.\gradlew.bat bootRun`.
3. Abra o app no celular e permita as notificações.

> No **Android**, o Expo Go não recebe push desde o SDK 53: é preciso um *development build* (`npx eas-cli@latest build --profile development --platform android`). No **iPhone**, o Expo Go funciona.

## Desligar tudo

- Em cada terminal: **Ctrl + C**
- Banco e storage: `cd backend` e depois `docker compose down` (os dados ficam guardados; `docker compose down -v` apaga tudo)

## Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| App continua com dados de exemplo | O `EXPO_PUBLIC_API_URL` é lido quando o app é empacotado. Confira o `.env.local` e reinicie com **`npx expo start -c`** (o `-c` limpa o cache). |
| "Sem conexão com o servidor" no app | O celular não alcança a API: teste a URL `/actuator/health` no navegador do celular. No modo B, confira o IP e o firewall. |
| Foto não sobe ou não aparece | `APP_MEDIA_ENDPOINT` / `APP_MEDIA_PUBLIC_URL` ainda apontam para `localhost`: use o IP (modo B) ou a URL_FOTOS (modo C). |
| `docker ... dockerDesktopLinuxEngine ... 500` | O Docker Desktop não está pronto: abra-o e espere "Engine running". Se persistir: `wsl --shutdown`, `wsl --update` e reabra. |
| `JAVA_HOME is not set` | Instale o JDK 21 e configure o `JAVA_HOME` (passo 0). |
| `'&&' não é um separador válido` | O PowerShell 5 não aceita `&&`: rode um comando por linha. |
| `package-lock.json: needs merge` | Rode `git restore mobile/package.json mobile/package-lock.json`, depois `git pull` e `npm install`. |
| Expo pede para instalar `@expo/ngrok` | Responda **Y** (ou `npm install -g @expo/ngrok`). |
| `PluginError: Failed to resolve plugin for module "expo-..."` | Faltam pacotes novos: `cd mobile` e `npm install`. Se continuar, apague a pasta `node_modules` e rode `npm install` de novo. |
| Login responde "Muitos códigos pedidos" | Limite de 5 códigos por hora por número: use outro número ou espere. |
