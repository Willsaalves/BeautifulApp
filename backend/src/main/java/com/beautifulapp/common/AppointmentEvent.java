package com.beautifulapp.common;

import java.time.Instant;
import java.util.UUID;

/**
 * Mudança relevante num agendamento (publicado por scheduling; notificações escutam).
 * Fica em common para que módulos que escutam não dependam de scheduling.
 */
public record AppointmentEvent(Kind kind, UUID appointmentId, UUID clientAccountId, UUID professionalId,
                               String serviceName, Instant startsAt, Instant depositDueAt) {

    public enum Kind {
        CREATED, RECEIPT_SENT, DEPOSIT_CONFIRMED, RECEIPT_REJECTED, ADJUSTMENT_PROPOSED, ADJUSTMENT_ACCEPTED,
        ADJUSTMENT_DECLINED, COMPLETED, CANCELLED_BY_CLIENT, CANCELLED_BY_PROFESSIONAL, EXPIRED, DEPOSIT_DUE_SOON
    }
}
