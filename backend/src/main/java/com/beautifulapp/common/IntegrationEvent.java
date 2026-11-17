package com.beautifulapp.common;

import java.time.Instant;
import java.util.UUID;

/** Evento que também sai do sistema por fila. eventId é estável (o mesmo em cada reenvio) para o consumidor ignorar duplicatas. */
public interface IntegrationEvent {
    UUID eventId();

    Instant occurredAt();
}
