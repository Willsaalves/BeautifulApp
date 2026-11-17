package com.beautifulapp.messaging.internal;

import java.net.URI;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * app.events.transport: log (só escreve no log, padrão em desenvolvimento) ou sqs.
 * app.events.queue-prefix: prefixo do nome da fila (appointment-events → beautifulapp-appointment-events).
 */
@ConfigurationProperties("app.events")
record MessagingProperties(@DefaultValue("log") String transport, @DefaultValue("beautifulapp-") String queuePrefix, @DefaultValue Sqs sqs) {
    /** endpoint vazio = AWS real (credenciais da task/role); com endpoint = ElasticMQ/LocalStack. */
    record Sqs(URI endpoint, @DefaultValue("us-east-1") String region, String accessKey, String secretKey, @DefaultValue("false") boolean createQueues) {}

    String queueName(String target) { return queuePrefix + target; }
}
