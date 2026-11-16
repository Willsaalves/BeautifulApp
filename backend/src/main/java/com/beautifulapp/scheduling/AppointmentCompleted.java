package com.beautifulapp.scheduling;

import java.util.UUID;

/** Evento publicado ao concluir um atendimento (estoque e fidelidade escutam na fase 4). */
public record AppointmentCompleted(UUID appointmentId, UUID professionalId, UUID clientAccountId, UUID serviceId, long paidCents) {}
