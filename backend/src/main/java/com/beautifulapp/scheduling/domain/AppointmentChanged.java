package com.beautifulapp.scheduling.domain;

import java.time.Instant;
import java.util.UUID;

/** Evento de domínio: algo aconteceu com o agendamento. O adaptador de eventos traduz para o resto do sistema. */
public record AppointmentChanged(Change change, UUID appointmentId, UUID clientAccountId, UUID professionalId, UUID serviceId,
                                 String serviceName, Instant startsAt, Instant depositDueAt, long paidCents) {
    public enum Change {
        CREATED, RECEIPT_SENT, DEPOSIT_CONFIRMED, RECEIPT_REJECTED, ADJUSTMENT_PROPOSED, ADJUSTMENT_ACCEPTED,
        ADJUSTMENT_DECLINED, COMPLETED, CANCELLED_BY_CLIENT, CANCELLED_BY_PROFESSIONAL, EXPIRED, DEPOSIT_DUE_SOON
    }
}
