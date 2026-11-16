# Arquitetura — BeautifulApp

> O levantamento completo do backend (stack, módulos, modelo de dados, API, segurança, AWS e fases) está em [`BACKEND.md`](./BACKEND.md).

```
 App (React Native / Expo)  ──HTTPS──►  ALB + WAF  ──►  API Java 21 / Spring Boot 3 (ECS Fargate)
   cliente + profissional                                 monólito modular (Spring Modulith)
   cliente TS gerado do OpenAPI                            │
                                                           ├── PostgreSQL 16 + PostGIS (RDS)
                                                           ├── Redis (ElastiCache): cache, rate limit
                                                           ├── S3 + CloudFront: fotos, stories, comprovantes (privado)
                                                           └── Worker JobRunr (mesma imagem)
                                                                 ├── expira sinais vencidos
                                                                 ├── lembretes de retorno / push (Expo)
                                                                 └── limpeza de stories (24h)
```

Resumo das escolhas:
- **Java 21 + Spring Boot 3**: a stack que o time domina, organizada como monólito modular.
- **PostgreSQL + PostGIS**: dados relacionais com transação e busca por distância. Uma *exclusion constraint* impede dois agendamentos no mesmo horário.
- **JobRunr** para tarefas com atraso (ex.: expirar o sinal) e **eventos do Spring Modulith com outbox** para a comunicação entre módulos. **Sem Kafka**, que é caro e desnecessário para esse volume.
- **OpenAPI → orval**: gera tipos e hooks TypeScript para o app, mantendo o contrato tipado.

As regras de negócio do protótipo (`mobile/src/domain/rules.ts`) são a especificação de referência. No backend, elas passam a ser a fonte da verdade.
