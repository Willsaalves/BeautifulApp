# BeautifulApp — Backend

Java 21 · Spring Boot 4.1 · Spring Modulith · PostgreSQL 16 + PostGIS · Flyway · S3 (pré-assinado) · JWT RS256

## Rodar localmente

```bash
cd backend
docker compose up -d          # Postgres+PostGIS (5432) e S3 local / Adobe S3Mock (9090)
./gradlew bootRun             # API em http://localhost:8080
```

- Swagger: http://localhost:8080/swagger-ui.html
- Health: http://localhost:8080/actuator/health
- **Código de login em dev/testes: `123456`** (`APP_OTP_FIXED_CODE`). O código também aparece no log (`[OTP DEV]`).

App apontando para a API:

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://localhost:8080 npx expo start   # celular físico: use o IP da máquina
```

Sem `EXPO_PUBLIC_API_URL` o app continua no modo protótipo (dados de exemplo).

## Testes

```bash
./gradlew test
```

Os testes de integração sobem um Postgres + PostGIS real com Testcontainers (precisa de Docker). Eles também:
- verificam as fronteiras entre módulos (`ModularityTest`, com diagramas em `build/spring-modulith-docs`);
- regeram `openapi.json`. Depois rode `npm run api:gen` no `mobile/` para atualizar os tipos TypeScript.

## Módulos

| Pacote | O que faz |
|---|---|
| `identity` | Conta por celular, OTP (hash + validade de 5 min + 5 tentativas + 5 envios/h), JWT de 15 min, refresh token rotativo com detecção de reuso, papéis, consentimentos LGPD |
| `profile` | `/me`, cadastro (cliente/profissional), @handle único, edição de perfil (foto/capa), localização do estúdio, favoritas |
| `catalog` | Serviços (opções e escolhas com acréscimo, ids estáveis na edição), Trending Designs com foto |
| `page` | Página da profissional em blocos (capa, galeria, porcentagem, contagem, texto, trending…); SERVICOS e AGENDA obrigatórios |
| `discovery` | Busca por nicho, texto e distância (PostGIS), página pública composta, vitrine de designs |
| `scheduling` | Expediente, bloqueios, horários livres, agendamento (preço/sinal no servidor), comprovante, confirmar/recusar, ajuste de valor, concluir/cancelar, expiração automática do sinal (a cada minuto); exclusion constraint impede horário duplicado |
| `inventory` | Produtos, compras com custo médio ponderado, consumo por serviço, baixa automática ao concluir (livro-razão, idempotente) |
| `loyalty` | Programa de fidelidade (meta R$ → % OFF), saldo por cliente, vouchers (fidelidade e bônus mensal por avaliação), uso no agendamento |
| `review` | Avaliação de atendimento concluído (1 por atendimento), nota média na busca e na página |
| `analytics` | Painel de lucratividade (faturamento − custo real das baixas) e clientes atrasadas para retorno |
| `media` | URL pré-assinada para upload direto ao storage; prefixos públicos (avatar, capa, portfólio, story, design) e privados (comprovante, referência); valida o dono da chave |
| `common` | Erros RFC 7807 com `code`, UUID v7, normalização de celular |

## Endpoints atuais

| Método | Rota | |
|---|---|---|
| POST | `/auth/otp/request` | `{phone}` → envia código |
| POST | `/auth/otp/verify` | `{phone, code}` → `{accessToken, refreshToken, isNew, roles}` |
| POST | `/auth/refresh` | rotação do refresh token |
| POST | `/auth/logout` | revoga a sessão |
| GET | `/me` | conta + perfis |
| POST | `/me/onboarding` | cria perfil de cliente ou profissional + consentimentos |
| PATCH | `/me/client-profile` · `/me/professional` | edita perfil |
| POST | `/media/upload-url` | `{kind, contentType, sizeBytes}` → `{key, uploadUrl, publicUrl}` |
| GET/POST/PUT/DELETE | `/me/services` | Serviços da profissional logada |
| GET/POST/PUT/DELETE | `/me/designs` | Trending Designs da profissional |
| GET/PUT | `/me/page/widgets` | Blocos da página (PUT salva a lista inteira, na ordem) |
| GET | `/professionals?niche&q&lat&lng&radiusKm` | Busca, ordenada por distância |
| GET | `/professionals/{id}` | Página pública: perfil + serviços + designs + blocos |
| GET | `/designs/trending?niche&lat&lng` | Vitrine de designs |
| GET/PUT/DELETE | `/me/favorites[/{professionalId}]` | Favoritas |
| GET/PUT | `/me/work-hours` | Expediente da semana |
| GET/POST/DELETE | `/me/blocks` | Bloqueios (folga, almoço) |
| GET | `/professionals/{id}/availability?date&serviceId` | Horários FREE / BUSY / PAST |
| POST | `/appointments` | Agendar (preço, sinal e prazo calculados no servidor) |
| GET | `/me/appointments` · `/me/agenda` · `/appointments/{id}` | Listas (cliente / profissional) e detalhe |
| POST | `/appointments/{id}/receipt` | Cliente envia comprovante (upload kind=RECEIPT, privado) |
| POST | `/appointments/{id}/confirm-deposit` · `/reject-receipt` | Profissional confere o sinal |
| POST | `/appointments/{id}/adjustment` · `/adjustment/accept` · `/adjustment/decline` | Novo valor |
| POST | `/appointments/{id}/complete` · `/cancel` | Concluir / cancelar |
| GET/POST/PUT/DELETE | `/me/products` · POST `/purchases` · `/adjustments` | Estoque |
| GET | `/me/stock-movements` · `/me/consumption` · PUT `/me/services/{id}/consumption` | Movimentações e consumo por serviço |
| GET/PUT | `/me/loyalty-program` | Fidelidade da profissional |
| GET | `/me/loyalty` · `/me/vouchers` | Cartões e vouchers da cliente |
| POST | `/appointments/{id}/review` · GET `/me/reviews` · `/professionals/{id}/reviews` | Avaliações |
| GET | `/me/analytics/profit?from&to` · `/me/analytics/overdue-clients` | Relatórios |

## Variáveis de ambiente (deploy de testes / produção)

| Variável | Exemplo | Observação |
|---|---|---|
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | Neon, Supabase (só banco) ou RDS | Precisa de PostGIS |
| `APP_JWT_PRIVATE_KEY` / `APP_JWT_PUBLIC_KEY` | PEM (PKCS#8 / X.509) | Sem elas, gera um par temporário (só dev) |
| `APP_OTP_FIXED_CODE` | `123456` em testes, **vazio em produção** | |
| `APP_OTP_SENDER` | `log` | Produção: implementar WhatsApp/Twilio (`OtpSender`) |
| `APP_OTP_PEPPER` | segredo aleatório | |
| `APP_MEDIA_ENDPOINT` / `_BUCKET` / `_ACCESS_KEY` / `_SECRET_KEY` / `_PUBLIC_URL` | Cloudflare R2, Supabase Storage ou S3 | Endpoint vazio = AWS S3 |
| `APP_CORS_ORIGINS` | `https://app.exemplo.com` | Só para o app web |

Gerar o par de chaves:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt.pem
openssl pkey -in jwt.pem -pubout -out jwt.pub
```
