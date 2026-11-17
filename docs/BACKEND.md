# Levantamento do Backend — BeautifulApp

## 1. Stack

**Decisão: Java 21 + Spring Boot 4.1** (última versão estável; o plano foi escrito para 3.x e vale igual). É a stack que o time domina, e ela atende tudo o que o app precisa. A única vantagem de usar TypeScript no backend seria compartilhar tipos com o app. Resolvemos isso gerando o cliente TypeScript a partir do OpenAPI (seção 1.2).

### 1.1 Componentes

| Camada | Escolha | Observação |
|---|---|---|
| Linguagem | **Java 21** (LTS) | Virtual threads ligadas (`spring.threads.virtual.enabled=true`) |
| Framework | **Spring Boot 4.1** | Web MVC, Validation, Security, Data JPA, Actuator |
| Arquitetura | **Monólito modular com Spring Modulith** | Módulos isolados por pacote. O Modulith verifica as fronteiras nos testes e publica eventos entre módulos. |
| Build | Gradle (Kotlin DSL) | Ou Maven, se o time preferir |
| Banco | **PostgreSQL 16 + PostGIS** (RDS) | Relacional, transacional, busca por distância, JSONB para widgets |
| Migrações | **Flyway** | |
| ORM | Spring Data JPA (Hibernate 6) + `hibernate-spatial` | Consultas pesadas (lucratividade, disponibilidade) em SQL nativo / jOOQ, se preciso |
| Cache / locks / rate limit | **Redis** (ElastiCache) + Spring Data Redis + **Bucket4j** | Cache de disponibilidade, limite de tentativas de OTP |
| Jobs agendados e com atraso | **JobRunr** (armazenamento no Postgres) | "Expirar este sinal em 12h", lembretes, voucher mensal. Sem Kafka. |
| Eventos entre módulos | Eventos do Spring Modulith + **outbox** (`event_publication`) | Se um dia precisarmos de eventos externos: SQS/EventBridge |
| Arquivos | **S3** com URL pré-assinada (AWS SDK v2) + CloudFront | Bucket público-CDN (portfólio, stories) e bucket privado (comprovantes) |
| Auth | Spring Security **OAuth2 Resource Server** com JWT próprio (chave RS256 no KMS/Secrets Manager) | Login por OTP, access token de 15 min + refresh token rotativo |
| OTP | WhatsApp Cloud API ou Twilio Verify; SMS via AWS SNS como fallback | Decidir custo (seção 9) |
| Push | API do **Expo Push** (HTTP) | O app já é Expo |
| Pagamento (v2) | PSP com Pix dinâmico (Asaas, Efí ou Mercado Pago) + webhook | v1: comprovante manual |
| Documentação da API | **springdoc-openapi** | Gera os tipos TS do app (`openapi-typescript` + `openapi-fetch`) |
| Testes | JUnit 5, **Testcontainers** (Postgres/Redis), testes do Modulith, RestAssured | |
| Observabilidade | Micrometer + OpenTelemetry → CloudWatch, **Sentry** | Logs JSON com `traceId` |
| Container | Imagem via Jib ou Buildpacks | |
| Infra | **Terraform** + GitHub Actions → ECR → **ECS Fargate** | |

### 1.2 Contrato com o app

1. O backend expõe `/v3/api-docs` (springdoc).
2. `npm run api:gen` gera `mobile/src/api/schema.d.ts` com **openapi-typescript**, e o cliente **openapi-fetch** usa esses tipos. O CI falha se o contrato ficar desatualizado.
3. O `app-store.tsx` atual (mock) troca cada ação por uma chamada a esses hooks, mantendo as mesmas assinaturas.

Assim os tipos continuam compartilhados, como tínhamos planejado com NestJS.

### 1.3 Fora da v1 (e por quê)

- **Kafka:** custo e operação altos para o volume que teremos. JobRunr + outbox resolvem.
- **Microserviços:** um monólito modular basta. Se um módulo precisar escalar sozinho (ex.: `chat`), ele sai depois sem reescrita.
- **GraphQL:** REST + OpenAPI é mais simples e gera o cliente tipado.
- **Elasticsearch:** PostGIS + `pg_trgm` cobrem a busca por nicho, nome e distância.

## 2. Módulos (Spring Modulith)

```
com.beautifulapp
├── identity       contas, OTP, JWT, dispositivos (push token), consentimentos LGPD
├── profile        perfil da cliente e da profissional (foto, capa, bio), favoritas
├── catalog        serviços, opções/escolhas, consumo por serviço, Trending Designs
├── page           widgets da página da profissional
├── scheduling     expediente, bloqueios, disponibilidade, agendamentos, ajuste de valor
├── payment        sinal, comprovante, confirmação; (v2) cobrança Pix + webhook do PSP
├── inventory      produtos, movimentações (livro-razão), custo médio, alertas
├── loyalty        programa de fidelidade, vouchers
├── review         avaliações / depoimentos
├── story          stories de 24h
├── chat           mensagens por agendamento
├── discovery      busca por nicho + distância
├── analytics      painel de lucratividade, faturamento
├── notification   push, WhatsApp/SMS, lembretes de retorno
└── media          upload pré-assinado, validação de arquivo
```

Os módulos conversam por **eventos de domínio**, por exemplo:
- `AppointmentCompleted` → `inventory` dá baixa no estoque, `loyalty` recalcula a fidelidade e `notification` pede avaliação.
- `DepositReceiptUploaded` → `notification` avisa a profissional.
- `ReviewCreated` → `loyalty` dá o voucher do mês.

## 3. Funcionalidades por módulo (o que já está no app)

### identity
- Login e cadastro por **celular + OTP**: 6 dígitos, validade de 5 min, máximo de 5 tentativas e limite de envio por número e por IP (Bucket4j/Redis).
- Papéis: `CLIENT` e `PROFESSIONAL`. Uma pessoa pode ter os dois.
- Registro de **consentimentos**: termos, privacidade e uso de imagem, com versão e data.
- LGPD: exportar dados (`GET /me/export`) e excluir conta (`DELETE /me`, com anonimização).

### profile
- Cliente: nome, @handle, bio, foto, capa, e-mail e favoritas.
- Profissional: nome, estúdio, nicho, bairro/cidade, **localização (geography Point)**, chave Pix, prazo do sinal, expediente e fidelidade.

### catalog
- Serviço: duração, preço, % do sinal, intervalo de retorno, exige referência (sim/não).
- Opções e escolhas com acréscimo de preço (formato, tamanho, decoração).
- **Consumo por atendimento:** produto + quantidade.
- **Trending Designs:** nome livre, foto, serviço e acréscimo.

### page
- Lista ordenada de widgets (`type`, `position`, `config JSONB`).
- `servicos` e `agenda` são fixos e não podem ser removidos (validação no backend).
- Endpoint de reordenação em lote.

### scheduling: arquitetura hexagonal (portas e adaptadores)
O módulo com a regra de negócio mais rica é organizado em camadas. As regras são verificadas pelo `SchedulingArchitectureTest`:

```
scheduling/
  SchedulingApi, AppointmentInfo, WorkDay     API pública para outros módulos (não mudou)
  domain/            regras puras: Appointment (ciclo de vida + eventos), Quote (preço), DepositPolicy,
                     Availability (horários livres), WorkingHours, TimeBlock. Só Java: sem Spring, JPA ou outros módulos.
  application/
    port/in/         casos de uso: ClientAppointments, ProfessionalAppointments, SharedAppointments,
                     ManageSchedule, AppointmentHousekeeping, AppointmentQueries
    port/out/        o que o domínio precisa: Appointments, Schedules, ServiceCatalog, Participants,
                     Files, Vouchers, BlockList, EventPublisher
    service/         implementação dos casos de uso (carrega → pede ao domínio → salva → publica eventos)
  adapter/
    in/web           controllers HTTP + DTOs (mesmo JSON de antes) + tradução de erro
    in/job           tarefas periódicas (sinal vencido, lembrete)
    in/event         reage a AccountDeleted
    in/module        implementa SchedulingApi para os outros módulos
    out/persistence  JPA (as entidades só existem aqui)
    out/modules      catalog, profile, media, loyalty e moderation atrás das portas
    out/events       eventos de domínio → eventos do sistema
```

O que isso dá na prática:
- **Testes rápidos:** as regras do domínio têm testes unitários puros (`AppointmentTest`, `QuoteAndAvailabilityTest`), sem Spring e sem banco, que rodam em milissegundos.
- **Trocar uma peça sem mexer na regra:** banco, catálogo ou forma de publicar eventos mudam só no adaptador.

### scheduling (o núcleo)
- **Disponibilidade** = expediente − bloqueios − agendamentos ativos, em passos de 30 min, retornando `livre / ocupado / passado`. A regra é a mesma de `daySlots` no app.
- **Concorrência:** duas clientes não podem pegar o mesmo horário. Uma *exclusion constraint* do Postgres garante isso:
  ```sql
  ALTER TABLE appointment ADD CONSTRAINT no_overlap
    EXCLUDE USING gist (professional_id WITH =, period WITH &&)
    WHERE (status IN ('AWAITING_DEPOSIT','RECEIPT_SENT','CONFIRMED','ADJUSTMENT_PENDING'));
  ```
- O **preço** é calculado no servidor (base + opções + design − voucher). O valor que o app mostra é só prévia.
- **Prazo do sinal:** ao criar o agendamento, agenda um job no JobRunr para `deposit_due_at`. Se o status ainda for `AWAITING_DEPOSIT`, o agendamento vira `EXPIRED` e o horário é liberado.
- Ajuste de valor: a profissional propõe e a cliente aceita ou recusa.
- Cancelamento pela política da profissional.

**Máquina de estados do agendamento**

```
              ┌──────────── cancelar ────────────┐
              ▼                                  │
AWAITING_DEPOSIT ──comprovante──► RECEIPT_SENT ──confirmar──► CONFIRMED ──concluir──► COMPLETED
     │   ▲                             │                        │   ▲
     │   └──────────recusar────────────┘                        │   │
     │                                                  propor  ▼   │ aceitar/recusar
     └── prazo vencido ──► EXPIRED                     ADJUSTMENT_PENDING
```

### payment
- v1: a cliente faz o upload do **comprovante** (obrigatório, no bucket privado) e a profissional confirma ou recusa.
- v2: o servidor cria a cobrança Pix no PSP (QR dinâmico com `txid`), o webhook confirma o pagamento e o status passa para `CONFIRMED` sozinho. O webhook é **idempotente** e tem a assinatura validada.

### inventory
- Toda entrada e saída é uma linha em `stock_movement` (livro-razão). O saldo é a soma das linhas, com uma cópia em cache na tabela de produto.
- Compra: atualiza o **custo médio ponderado**.
- `AppointmentCompleted`: baixa o consumo do serviço **na mesma transação**, com idempotência por `appointment_id`.
- Alerta de estoque abaixo do mínimo (push).
- Lote e validade, para a estética avançada.

### loyalty
- Programa por profissional: meta em R$ e % de desconto.
- Progresso **calculado** a partir dos agendamentos concluídos; não é guardado. Ao cruzar a meta, emite o voucher (idempotência por `client + professional + cycle`).
- Voucher por avaliação: 1 por mês, garantido por uma unique constraint em `(client_id, kind, year_month)`.

### review, story, chat
- Avaliação: 1 por agendamento concluído.
- Story: `expires_at = created_at + 24h`. O feed filtra por `expires_at > now()` e um job remove os arquivos antigos do S3.
- Chat: v1 via REST + push. v2 via WebSocket (STOMP), com relay em Redis/RabbitMQ se houver mais de uma instância.

### messaging: eventos por fila (outbox)
Os eventos que interessam a sistemas de fora saem por fila. São os marcados com `@Externalized`:

| Evento | Fila | Chave (ordem) |
|---|---|---|
| `AppointmentEvent` (criado, sinal, ajuste, cancelado, expirado…) | `beautifulapp-appointment-events` | id do agendamento |
| `AppointmentCompleted` | `beautifulapp-appointment-events` | id do agendamento |
| `AccountDeleted` | `beautifulapp-account-events` | id da conta |

**Como funciona (outbox do Spring Modulith):**
1. O evento é gravado na tabela `event_publication` **na mesma transação** da mudança. Se a transação for desfeita, o evento some junto.
2. Depois do commit, o `messaging` monta o envelope e envia para a fila.
3. Se a fila estiver fora do ar, o evento fica pendente. Ele é reenviado a cada minuto (`OutboxJobs`) e ao reiniciar a API. Os já entregues são apagados depois de 7 dias.

**Envelope** (corpo da mensagem):
```json
{"id":"…eventId…","type":"AccountDeleted","version":1,"occurredAt":"…","key":"…","data":{ …o evento… }}
```
- `id` é o mesmo em todo reenvio: o consumidor usa para **ignorar duplicatas** (o SQS comum entrega pelo menos uma vez).
- `type` + `version` formam o contrato. Mudança incompatível = nova versão.
- Filas FIFO (nome terminando em `.fifo`) recebem `MessageGroupId = key` (ordem por agendamento) e deduplicação pelo `id`.

**Configuração** (`app.events.*`):
- `transport=log`: padrão, só mostra no log o que iria para a fila.
- `transport=sqs`: envia de verdade. Com `sqs.endpoint` vazio, vai para a AWS com as credenciais da role. Com `http://localhost:9324`, vai para o ElasticMQ do `docker compose`, que tem um painel em http://localhost:9325.
- **Na AWS:** criar as duas filas (de preferência com DLQ) e dar à role da API `sqs:SendMessage` e `sqs:GetQueueUrl`.

**Extrair um serviço no futuro:** o serviço novo consome a fila (ex.: um `notification` separado lendo `appointment-events`). Depois, o listener interno equivalente é removido do monólito.

### legal (Termos de Uso e Política de Privacidade)
- **Fonte única:** os textos ficam em `backend/src/main/resources/legal/` (`termos.md`, `privacidade.md`); os dados da empresa e a versão, em `_dados.yml`.
- **Páginas públicas:** a API publica `/legal/termos` e `/legal/privacidade`. Use a URL da política na App Store e na Play Store.
- **No app:** `npm run legal:gen` copia os textos para dentro do app, que assim funciona offline. A CI falha se o app ficar com texto diferente do backend.
- **Nova versão:** ao trocar a `versao` no `_dados.yml`, quem aceitou a versão anterior vê a tela "Atualizamos nossos termos" ao abrir o app (`GET /me` → `legal.accepted`, aceite em `POST /me/consents`).
- **Uso de imagem:** é um consentimento separado, que a usuária liga e desliga em Perfil → Privacidade (revogação registrada, LGPD art. 8º §5º).

### moderation e exclusão de conta (exigências das lojas)
- **Excluir conta** (`DELETE /me`): numa transação só, cada módulo apaga ou anonimiza o que é dele (evento `AccountDeleted`):
  - perfil vira "Conta excluída" (sem foto, capa, bio, Pix e localização);
  - a profissional sai da busca, da vitrine e da página pública, e os serviços dela saem do ar;
  - favoritas, stories, aparelhos de push, notificações, saldo de fidelidade e vouchers não usados são apagados;
  - agendamentos em andamento são cancelados, e a outra parte é avisada;
  - fotos públicas são apagadas do storage depois do commit;
  - o celular fica livre para uma conta nova, e o token de acesso deixa de valer na hora.

  Ficam, sem dados pessoais: atendimentos concluídos, avaliações e comprovantes (registro da outra parte).
- **Denunciar** (`POST /reports`): perfil, cliente, story, avaliação ou mensagem, com motivo (spam, conteúdo impróprio, assédio, golpe, outro).
  - Com **3 denúncias de pessoas diferentes**, o story ou a avaliação sai do ar até a revisão (evento `ContentFlagged`).
  - Cada denúncia aparece no log como `[DENÚNCIA]`.
- **Bloquear** (`POST /me/blocked`, `DELETE /me/blocked/{accountId}`, `GET /me/blocked`): vale nos dois sentidos. Uma não vê a outra na busca, na vitrine, na página e nos stories, e não consegue agendar nem mandar mensagem.
- **Revisão das denúncias** (a Apple pede ação em até 24h): até existir o painel de administração, a revisão é feita direto no banco:
  ```sql
  SELECT created_at, target_type, target_id, reason, details FROM report WHERE status = 'OPEN' ORDER BY created_at;
  -- conteúdo ok: devolve ao ar e fecha a denúncia
  UPDATE story SET hidden_at = NULL WHERE id = '...';
  UPDATE report SET status = 'DISMISSED', reviewed_at = now() WHERE target_id = '...';
  -- conteúdo removido: fecha como ACTIONED (e, se for o caso, exclui o story ou a conta)
  UPDATE report SET status = 'ACTIONED', reviewed_at = now() WHERE target_id = '...';
  ```

### discovery
- `GET /professionals?niche=unha&lat=&lng=&radiusKm=5&q=`, usando `ST_DWithin` + `pg_trgm` para o texto.
- Ordenação: distância, nota e favoritas primeiro.

### analytics
- Painel de lucratividade por período: faturamento, custo de material (consumo × custo médio), lucro, margem, ticket médio, compras e ranking por serviço. Começa com SQL agregado; se pesar, usa uma *materialized view*.

### notification
- Lembrete de sinal perto do vencimento, novo comprovante, ajuste de valor, lembrete de retorno (intervalo do serviço) e estoque baixo.
- Canais: push (Expo) e WhatsApp com templates aprovados.

## 4. Modelo de dados (principais tabelas)

```
account(id, phone UNIQUE, email, created_at, deleted_at)
account_role(account_id, role)
consent(id, account_id, kind, version, accepted_at)
refresh_token(id, account_id, hash, expires_at, revoked_at)
device(id, account_id, expo_push_token, platform)

client_profile(account_id PK, name, handle UNIQUE, bio, photo_key, cover_key)
professional(id, account_id, name, studio, handle UNIQUE, niche, bio, photo_key, cover_key,
             neighborhood, city, location geography(Point), pix_key,
             deposit_deadline_hours, rating_avg, rating_count)
work_hours(professional_id, weekday, start_time, end_time)
time_block(id, professional_id, period tstzrange, reason)
favorite(client_id, professional_id)

service(id, professional_id, name, niche, duration_min, price_cents, deposit_percent,
        return_interval_days, requires_reference, active)
service_option(id, service_id, label, position)
service_choice(id, option_id, label, price_delta_cents)
service_consumption(service_id, product_id, amount NUMERIC)
design(id, professional_id, service_id, name, image_key, price_delta_cents, position)
page_widget(id, professional_id, type, position, fixed, config JSONB)

appointment(id, client_id, professional_id, service_id, design_id, period tstzrange,
            status, price_cents, discount_cents, deposit_cents, deposit_due_at,
            receipt_key, reference_key, notes, selections JSONB, created_at, version)
price_adjustment(id, appointment_id, new_price_cents, note, status, created_at)

product(id, professional_id, name, unit, quantity NUMERIC, min_quantity, avg_cost_cents, lot, expires_at)
stock_movement(id, product_id, delta NUMERIC, reason, unit_cost_cents, appointment_id, created_at)
  UNIQUE(product_id, appointment_id) WHERE reason='ATTENDANCE'

loyalty_program(professional_id PK, enabled, goal_cents, discount_percent)
voucher(id, client_id, professional_id NULL, kind, percent, used_at, cycle, year_month, created_at)
review(id, appointment_id UNIQUE, client_id, professional_id, rating, comment, created_at)
story(id, author_account_id, professional_id, service_id, image_key, caption, created_at, expires_at)
chat_message(id, appointment_id, sender_account_id, text, created_at)
next_procedure(id, client_id, niche, label, target_date, done)      -- "Seus próximos procedimentos"
audit_log(id, account_id, action, entity, entity_id, at, ip)
```

Convenções:
- Dinheiro em **centavos (`BIGINT`)**.
- Datas em **UTC (`timestamptz`)**; a regra de expediente usa `America/Sao_Paulo`.
- IDs em **UUID v7**.
- `version` para *optimistic locking*.

## 5. API (primeiros endpoints)

```
POST   /auth/otp/request            {phone}
POST   /auth/otp/verify             {phone, code} → {access, refresh, isNew}
POST   /auth/refresh
POST   /accounts                    cadastro (cliente/profissional)
GET    /me · PATCH /me · GET /me/export · DELETE /me

GET    /professionals?niche&lat&lng&radiusKm&q
GET    /professionals/{id}                     página (widgets + serviços + designs)
GET    /professionals/{id}/availability?date&serviceId
PUT    /me/page/widgets                        reordenar/editar
CRUD   /me/services · /me/designs · /me/products
POST   /me/products/{id}/purchases

POST   /appointments                           {serviceId, start, selections, designId, voucherId}
GET    /appointments?role=client|professional&from&to&status
POST   /appointments/{id}/receipt              (após upload pré-assinado)
POST   /appointments/{id}/confirm-deposit | /reject-receipt
POST   /appointments/{id}/adjustments · /adjustments/{aid}/accept|decline
POST   /appointments/{id}/complete | /cancel
GET/POST /appointments/{id}/messages
POST   /appointments/{id}/review

POST   /media/upload-url                       {kind: avatar|cover|portfolio|story|receipt|reference}
GET/POST /stories · GET /stories?professionalId
GET    /me/vouchers · GET /me/loyalty
GET    /me/analytics/profit?from&to
POST   /webhooks/pix/{psp}                     (v2)
```

Padrões:
- Erros no formato **RFC 7807** (`ProblemDetail`).
- Paginação por cursor.
- Header `Idempotency-Key` em `POST /appointments`, `/receipt` e `/complete`.

## 6. Segurança e LGPD

- Foto de procedimento, alergia e anamnese são **dado pessoal sensível** (art. 11). Por isso:
  - consentimento explícito e registrado;
  - criptografia em repouso (RDS e S3 com KMS);
  - TLS em todo lugar.
- **Autorização por recurso**: a cliente só vê os próprios agendamentos, e a profissional só vê as próprias clientes, o próprio estoque e o próprio painel. Feita com `@PreAuthorize` + checagem de dono no serviço, com testes cobrindo cada endpoint.
- Os comprovantes ficam no bucket **privado**, com URL assinada de 5 min. Nunca ficam públicos.
- Uploads:
  - validar tipo e tamanho;
  - remover os metadados EXIF (localização) das fotos públicas;
  - antivírus opcional (ClamAV/Lambda).
- Rate limit em OTP, login e criação de agendamento; WAF no ALB.
- Segredos no **Secrets Manager**; nada no repositório.
- `audit_log` para ações sensíveis: ver comprovante, exportar e excluir dados.
- Backups automáticos do RDS (7–14 dias), PITR e teste de restauração.

## 7. Infra AWS (estimativa inicial)

| Recurso | Tamanho inicial | Custo aprox./mês* |
|---|---|---|
| ECS Fargate (API + worker JobRunr) | 2 tasks 0.5 vCPU / 1 GB | US$ 30–40 |
| RDS PostgreSQL | db.t4g.small, 20 GB, single-AZ no início | US$ 30–35 |
| ElastiCache Redis | cache.t4g.micro | US$ 12 |
| ALB | 1 | US$ 18–22 |
| S3 + CloudFront | poucos GB | US$ 5 |
| Secrets Manager, CloudWatch, ECR | — | US$ 10 |
| **Total** | | **~US$ 105–125** |

\* Valores de referência em us-east-1; confirmar na calculadora da AWS. Em `sa-east-1` (São Paulo) fica mais caro, mas tem menos latência. **Evitar NAT Gateway** (~US$ 32): use VPC endpoints para S3/ECR/Secrets, ou tasks em subnet pública com security group restrito.

Ambientes: `dev` (local com Docker Compose: Postgres + PostGIS, Redis, LocalStack S3), `staging` e `prod`.

## 8. Ordem de construção

| Fase | Entrega | Pronto quando… |
|---|---|---|
| 0 ✅ | Repositório `backend/`, Gradle, Docker Compose, Flyway, CI, OpenAPI → cliente TS | `./gradlew test` verde com Testcontainers |
| 1 ✅ | identity (OTP, JWT, cadastro, consentimentos) + profile + media | O app faz login e cadastro de verdade |
| 2 ✅ | catalog + page + discovery | A página da profissional e a busca vêm da API |
| 3 ✅ | scheduling + payment v1 (comprovante) + jobs de expiração | Agendar, pagar sinal e expirar funcionam fim a fim |
| 4 ✅ | inventory + loyalty + review + analytics | Concluir dá baixa no estoque, avança a fidelidade e o painel bate |
| 5 ✅ | story + chat + notification (push) | Stories, chat, caixa de notificações e push (WhatsApp fica para produção) |
| 6 | Terraform AWS, staging, observabilidade, testes de carga | Deploy automático em staging |
| 7 | Payment v2 (PSP Pix + webhook) | Sinal confirmado sem comprovante |

## 9. Decisões em aberto

1. **PSP de Pix** para a v2 (Asaas, Efí, Mercado Pago, Pagar.me): taxas, split e se a profissional precisa de CNPJ.
2. **Canal do OTP**: WhatsApp (mais barato e com mais entrega no Brasil, mas exige template aprovado) ou SMS.
3. **Região AWS**: `sa-east-1` (latência, dados no Brasil) ou `us-east-1` (custo).
4. Uma profissional com **equipe** (várias agendas) entra na v1? A sugestão do mapa de telas é deixar para a fase 4.
5. Política de cancelamento: só expirar o sinal, ou também ter regras de reembolso por antecedência?
6. Quem é o **encarregado (DPO)** da LGPD. Os textos de termos e privacidade já existem (rascunho), mas faltam a razão social, o CNPJ, o endereço e o DPO em `legal/_dados.yml`, além da revisão de um advogado.
