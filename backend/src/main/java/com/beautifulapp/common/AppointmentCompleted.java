package com.beautifulapp.common;

import java.time.Instant;
import java.util.UUID;

import org.springframework.modulith.events.Externalized;

/**
 * Evento de domínio: atendimento concluído. Publicado por scheduling; estoque e fidelidade escutam.
 * Fica em common para não criar ciclo entre módulos. Também sai para a fila "appointment-events".
 */
@Externalized("appointment-events::#{appointmentId()}")
public record AppointmentCompleted(UUID appointmentId, UUID professionalId, UUID clientAccountId, UUID serviceId, long paidCents,
                                   UUID eventId, Instant occurredAt) implements IntegrationEvent {}
