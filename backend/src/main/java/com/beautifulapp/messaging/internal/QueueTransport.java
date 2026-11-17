package com.beautifulapp.messaging.internal;

/** Envia uma mensagem já serializada para a fila. Lança exceção se não conseguir (o outbox reenvia depois). */
interface QueueTransport {
    void send(String queue, IntegrationMessage message, String json);
}
