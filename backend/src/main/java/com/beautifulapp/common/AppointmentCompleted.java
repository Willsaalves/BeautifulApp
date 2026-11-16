package com.beautifulapp.common;

import java.util.UUID;

/** Evento de domínio: atendimento concluído. Publicado por scheduling; estoque e fidelidade escutam. Fica em common para não criar ciclo entre módulos. */
public record AppointmentCompleted(UUID appointmentId, UUID professionalId, UUID clientAccountId, UUID serviceId, long paidCents) {}
