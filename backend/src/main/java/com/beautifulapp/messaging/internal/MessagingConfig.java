package com.beautifulapp.messaging.internal;

import java.util.concurrent.CompletableFuture;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.modulith.events.EventExternalizationConfiguration;
import org.springframework.modulith.events.Externalized;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.modulith.events.support.EventExternalizationTransport;
import org.springframework.modulith.events.support.EventExternalizerModuleListener;

import com.beautifulapp.common.IntegrationEvent;

import tools.jackson.databind.json.JsonMapper;

@Configuration
@EnableConfigurationProperties(MessagingProperties.class)
class MessagingConfig {

    /** Só os eventos marcados com @Externalized saem; o destino e a chave vêm da própria anotação. */
    @Bean
    EventExternalizationConfiguration eventExternalizationConfiguration() {
        return EventExternalizationConfiguration.externalizing()
                .select(EventExternalizationConfiguration.annotatedAsExternalized())
                .build();
    }

    @Bean(destroyMethod = "")
    QueueTransport queueTransport(MessagingProperties props) {
        return switch (props.transport()) {
            case "sqs" -> new SqsQueueTransport(props.sqs());
            case "log" -> new LoggingQueueTransport();
            default -> throw new IllegalStateException("app.events.transport inválido: " + props.transport() + " (use log ou sqs)");
        };
    }

    /**
     * Chamado pelo Modulith depois do commit, para cada evento pendente no outbox.
     * Se lançar exceção, a publicação continua pendente e é reenviada depois.
     */
    @Bean
    EventExternalizerModuleListener eventExternalizer(EventExternalizationConfiguration config, QueueTransport transport, MessagingProperties props,
                                                      JsonMapper json, BeanFactory beanFactory) {
        EventExternalizationTransport toQueue = (event, target) -> {
            try {
                if (!(event instanceof IntegrationEvent e)) {
                    throw new IllegalStateException(event.getClass().getName() + " é @" + Externalized.class.getSimpleName() + " mas não implementa IntegrationEvent");
                }
                var message = new IntegrationMessage(e.eventId(), event.getClass().getSimpleName(), IntegrationMessage.VERSION,
                        e.occurredAt(), target.getKey(), event);
                transport.send(props.queueName(target.getTarget()), message, json.writeValueAsString(message));
                return CompletableFuture.completedFuture(null);
            } catch (RuntimeException ex) {
                return CompletableFuture.failedFuture(ex);
            }
        };
        return new EventExternalizerModuleListener(config, toQueue, beanFactory);
    }
}
