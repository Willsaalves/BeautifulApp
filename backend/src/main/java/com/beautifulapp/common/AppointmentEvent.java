package com.beautifulapp.common;

import java.time.Instant;
import java.util.UUID;

import org.springframework.modulith.events.Externalized;

/**
 * Mudança relevante num agendamento (publicado por scheduling; notificações escutam).
 * Fica em common para que módulos que escutam não dependam de scheduling.
 * <p>Também sai para a fila "appointment-events" (chave = agendamento, para manter a ordem).
 * eventId é único por evento: quem consome usa para ignorar mensagens repetidas.
 */
@Externalized("appointment-events::#{appointmentId()}")
public record AppointmentEvent(Kind kind, UUID appointmentId, UUID clientAccountId, UUID professionalId,
                               String serviceName, Instant startsAt, Instant depositDueAt, UUID eventId, Instant occurredAt) implements IntegrationEvent {

    public enum Kind {
        CREATED, RECEIPT_SENT, DEPOSIT_CONFIRMED, RECEIPT_REJECTED, ADJUSTMENT_PROPOSED, ADJUSTMENT_ACCEPTED,
        ADJUSTMENT_DECLINED, COMPLETED, CANCELLED_BY_CLIENT, CANCELLED_BY_PROFESSIONAL, EXPIRED, DEPOSIT_DUE_SOON
    }
}
