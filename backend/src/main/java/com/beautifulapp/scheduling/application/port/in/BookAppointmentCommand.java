package com.beautifulapp.scheduling.application.port.in;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Pedido de agendamento da cliente. selections: opção → escolha. */
public record BookAppointmentCommand(UUID clientAccountId, UUID serviceId, Instant startsAt, Map<UUID, UUID> selections,
                                     UUID designId, String referenceKey, String notes, UUID voucherId) {}
