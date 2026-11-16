# BeautifulApp

App de agendamento para profissionais de beleza autônomas (unha, cílios, sobrancelha, estética) e suas clientes.

- `mobile/`: app React Native (Expo SDK 58, Expo Router, TypeScript). Por enquanto usa dados de exemplo em memória.
- `docs/ARQUITETURA.md`: recomendação de backend, AWS e segurança.

## Rodar

```bash
cd mobile
npm install
npx expo start        # abra no Expo Go (iOS/Android) ou aperte "w" para web
```

## O que já funciona (protótipo navegável)

**Cliente**: home "Olá, Bruna!" com os procedimentos dos sonhos (barra de progresso), o próximo horário, "último procedimento há X dias" com **Reagendar**, cartões fidelidade, vouchers, encontrar profissionais por nicho e distância, favoritar, agendar escolhendo opções (formato, tamanho, decoração) + foto de referência, sinal via Pix com comprovante obrigatório e contagem regressiva, aceitar novo valor, chat, avaliação com bônus mensal.

**Profissional**: home com faturamento, comprovantes para conferir, agenda do dia, clientes atrasadas e alerta de estoque. Também: agenda por dia com filtros, confirmar/recusar comprovante, sugerir novo valor, concluir atendimento (baixa automática no estoque + fidelidade), clientes com ficha e linha do tempo, estoque com registro de compra, serviços com consumo por atendimento, configuração de fidelidade, Pix e prazo do sinal.
