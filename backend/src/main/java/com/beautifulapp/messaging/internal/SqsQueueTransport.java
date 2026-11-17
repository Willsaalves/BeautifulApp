package com.beautifulapp.messaging.internal;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.MessageAttributeValue;
import software.amazon.awssdk.services.sqs.model.QueueDoesNotExistException;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

/**
 * Transporte SQS. Fila comum: entrega pelo menos uma vez (o consumidor ignora repetidas pelo id).
 * Fila FIFO (nome terminando em .fifo): ordem garantida por chave (MessageGroupId) e deduplicação pelo id.
 */
class SqsQueueTransport implements QueueTransport, AutoCloseable {
    private static final Logger log = LoggerFactory.getLogger(SqsQueueTransport.class);

    private final SqsClient sqs;
    private final boolean createQueues;
    private final Map<String, String> urls = new ConcurrentHashMap<>();

    SqsQueueTransport(MessagingProperties.Sqs props) {
        var b = SqsClient.builder().region(Region.of(props.region()));
        if (props.accessKey() != null && !props.accessKey().isBlank()) {
            b.credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(props.accessKey(), props.secretKey())));
        } else {
            b.credentialsProvider(DefaultCredentialsProvider.builder().build());
        }
        if (props.endpoint() != null) b.endpointOverride(props.endpoint());
        this.sqs = b.build();
        this.createQueues = props.createQueues();
    }

    @Override
    public void send(String queue, IntegrationMessage message, String json) {
        var req = SendMessageRequest.builder()
                .queueUrl(url(queue))
                .messageBody(json)
                .messageAttributes(Map.of(
                        "type", MessageAttributeValue.builder().dataType("String").stringValue(message.type()).build(),
                        "version", MessageAttributeValue.builder().dataType("Number").stringValue(String.valueOf(message.version())).build()));
        if (queue.endsWith(".fifo")) {
            req.messageGroupId(message.key()).messageDeduplicationId(message.id().toString());
        }
        sqs.sendMessage(req.build());
    }

    private String url(String queue) {
        return urls.computeIfAbsent(queue, q -> {
            try {
                return sqs.getQueueUrl(r -> r.queueName(q)).queueUrl();
            } catch (QueueDoesNotExistException e) {
                if (!createQueues) throw e;
                log.info("Criando a fila {}", q);
                return sqs.createQueue(r -> r.queueName(q)).queueUrl();
            }
        });
    }

    @Override
    public void close() { sqs.close(); }
}
