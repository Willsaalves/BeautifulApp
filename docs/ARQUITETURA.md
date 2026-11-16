# Arquitetura — BeautifulApp

## Visão geral

```
 App (React Native / Expo)  ──HTTPS──►  API Gateway / ALB  ──►  API (NestJS, ECS Fargate)
   cliente + profissional                                          │
   (o mesmo app, e a área da cliente                               ├── PostgreSQL (RDS) + PostGIS
    também pode sair como PWA via Expo web)                        ├── Redis (ElastiCache): cache, filas BullMQ, rate limit
                                                                   ├── S3 + CloudFront: fotos, referências, comprovantes
                                                                   └── Worker (mesma imagem, outro processo)
                                                                         ├── expira sinais vencidos (política de cancelamento)
                                                                         ├── lembretes de retorno / push (Expo Push)
                                                                         └── voucher mensal de feedback
```

## Recomendação de backend

| Peça | Escolha | Por quê |
|---|---|---|
| Linguagem / framework | **Node.js + TypeScript + NestJS** | Mesma linguagem do app: os tipos e regras de `mobile/src/domain` passam a ser um pacote compartilhado. Nest traz módulos, validação, guards e OpenAPI prontos. |
| Banco | **PostgreSQL (RDS)** + **Prisma** | Os dados são relacionais (agendamento ↔ serviço ↔ estoque ↔ fidelidade). A baixa de estoque e a geração de voucher precisam de transação. **PostGIS** resolve "nail designer perto de mim". |
| Cache / filas | **Redis (ElastiCache)** + **BullMQ** | Jobs com atraso: "expirar este sinal daqui a 12h", lembrete de manutenção, push. Também lock de horário (evita duas clientes no mesmo slot) e rate limit. |
| Arquivos | **S3** com URL pré-assinada + CloudFront | O app sobe a foto direto pro S3; a API nunca recebe o binário. Comprovantes ficam em bucket privado. |
| Auth | **Telefone + OTP (SMS/WhatsApp)** com JWT próprio, ou **Cognito** | O público é de celular e WhatsApp; senha atrapalha. |
| Pagamento | v1: Pix manual + comprovante (como no protótipo). v2: **PSP com Pix dinâmico** (Asaas, Efí, Mercado Pago, Pagar.me) | Com o webhook do PSP, o sinal se confirma sozinho e a profissional não precisa mais conferir comprovante. |
| Push | **Expo Push Notifications** | Integrado ao app, sem configurar APNs/FCM na mão. |
| Infra como código | **Terraform** (ou AWS CDK em TS) | Ambientes dev/staging/prod idênticos. |
| CI/CD | GitHub Actions → ECR → ECS; **EAS Build/Update** para o app | |
| Observabilidade | CloudWatch + Sentry (app e API) | |

### Kafka?

**Não agora.** Kafka (MSK) custa a partir de algumas centenas de dólares por mês e dá trabalho de operação. Ele compensa com milhões de eventos por dia e vários times consumindo o mesmo fluxo. Para agendamento, estoque e lembretes, **Redis + BullMQ** resolve. Se um dia precisarmos de eventos entre serviços (analytics, recomendação), o próximo passo é **SNS + SQS / EventBridge**, que é gerenciado e cobra por uso. Kafka só depois disso, se o volume pedir.

### Microserviços?

**Não na v1.** Um **monólito modular** em NestJS, com os módulos `auth`, `profissionais`, `agenda`, `pagamentos`, `estoque`, `fidelidade`, `feedback` e `chat`, e um processo worker separado. Se algum módulo precisar crescer sozinho, ele sai depois.

### Chat

v1: mensagens em Postgres + polling/push. v2: WebSocket (Socket.IO com adapter Redis) ou AWS API Gateway WebSocket.

## Regras de negócio já modeladas no app (`mobile/src/domain/rules.ts`)

- **Preço** = base + acréscimos das opções (formato, tamanho, decoração).
- **Sinal** = % do serviço. **Prazo** = X horas definidas pela profissional, nunca depois do horário. Sem comprovante até o prazo, o status vira `expirado` e o horário é liberado.
- **Ajuste de valor**: a profissional propõe e a cliente aceita ou recusa.
- **Estoque**: cada serviço tem um consumo por atendimento. Ao concluir, o app dá baixa e avisa abaixo do mínimo ("ela saberá que tem que comprar mais").
- **Fidelidade**: a profissional define a meta em R$ e o % de desconto. Ao bater a meta, o voucher é gerado automaticamente.
- **Feedback**: 1 voucher do app por mês por cliente.
- **Recorrência**: intervalo de retorno por serviço, "último botox há X dias", lista de clientes atrasadas.

No backend, essas funções ficam do lado do servidor (fonte da verdade). O app continua usando as mesmas funções para mostrar uma prévia.

## Segurança e LGPD (próxima etapa)

- Dados de saúde/estética (alergias, anamnese, fotos) são **dado pessoal sensível** (LGPD art. 11): consentimento explícito, criptografia em repouso (RDS/S3 KMS) e acesso só da profissional que atende.
- Autorização por recurso: a cliente só vê os próprios agendamentos, e a profissional só vê as próprias clientes e o próprio estoque.
- Comprovantes e fotos em bucket privado, com URL assinada de curta duração.
- Segredos no AWS Secrets Manager; WAF no ALB; backups automáticos do RDS.

## Próximos passos

1. Monorepo (`mobile/`, `backend/`, `packages/domain`) e extrair as regras para um pacote.
2. API NestJS + Prisma: schema a partir de `mobile/src/domain/types.ts`.
3. Auth por OTP e troca do `app-store` por chamadas reais (React Query).
4. Worker BullMQ: expiração de sinal e lembretes.
5. Terraform da AWS (VPC, RDS, ElastiCache, ECS, S3, CloudFront).
