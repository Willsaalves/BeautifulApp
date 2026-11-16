package com.beautifulapp.scheduling;

import java.time.Instant;
import java.util.UUID;

/** Resumo de um agendamento para outros módulos (avaliações, relatórios). */
public record AppointmentInfo(UUID id, UUID clientAccountId, UUID professionalId, UUID serviceId, String serviceName,
                              String status, Instant startsAt, long paidCents) {}
