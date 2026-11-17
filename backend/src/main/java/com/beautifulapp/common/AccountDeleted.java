package com.beautifulapp.common;

import java.time.Instant;
import java.util.UUID;

import org.springframework.modulith.events.Externalized;

/**
 * A conta pediu exclusão (LGPD / exigência das lojas). Publicado dentro da transação do DELETE /me:
 * cada módulo apaga ou anonimiza o que é dele, e tudo é desfeito junto se algo falhar.
 * Registros que outras pessoas precisam (atendimentos já feitos, avaliações, comprovantes) ficam, mas sem dados pessoais.
 * <p>Também sai para a fila "account-events": um serviço extraído no futuro precisa apagar os dados dele também.
 */
@Externalized("account-events::#{accountId()}")
public record AccountDeleted(UUID accountId, Instant at, UUID eventId) implements IntegrationEvent {
    @Override
    public Instant occurredAt() { return at; }
}
