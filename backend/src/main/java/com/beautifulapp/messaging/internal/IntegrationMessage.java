package com.beautifulapp.messaging.internal;

import java.time.Instant;
import java.util.UUID;

/**
 * Envelope de toda mensagem na fila. type + version formam o contrato: mudança incompatível no evento = nova versão.
 * id é o eventId (estável entre reenvios) e key agrupa as mensagens de um mesmo agendamento/conta.
 */
record IntegrationMessage(UUID id, String type, int version, Instant occurredAt, String key, Object data) {
    static final int VERSION = 1;
}
