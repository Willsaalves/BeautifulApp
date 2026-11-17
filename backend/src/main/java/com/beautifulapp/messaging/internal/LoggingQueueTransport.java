package com.beautifulapp.messaging.internal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Transporte de desenvolvimento: mostra no log o que iria para a fila. */
class LoggingQueueTransport implements QueueTransport {
    private static final Logger log = LoggerFactory.getLogger(LoggingQueueTransport.class);

    @Override
    public void send(String queue, IntegrationMessage message, String json) {
        log.info("[FILA {}] {} {}", queue, message.type(), json);
    }
}
