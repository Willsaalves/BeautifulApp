package com.beautifulapp.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.IncompleteEventPublications;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;

import com.beautifulapp.ApiTestSupport;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.QueueDoesNotExistException;

/** Eventos saem por uma fila SQS de verdade (ElasticMQ) e o outbox não perde nada quando a fila está fora do ar. */
class QueueOutboxTest extends ApiTestSupport {
    static final GenericContainer<?> ELASTICMQ = new GenericContainer<>("softwaremill/elasticmq-native:1.6.11").withExposedPorts(9324);
    static final String PREFIX = "test-";
    static SqsClient sqs;

    static {
        ELASTICMQ.start();
        sqs = SqsClient.builder().region(Region.US_EAST_1)
                .endpointOverride(URI.create("http://" + ELASTICMQ.getHost() + ":" + ELASTICMQ.getMappedPort(9324)))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("x", "x"))).build();
        sqs.createQueue(r -> r.queueName(PREFIX + "appointment-events")); // a de contas fica sem criar: é o teste do outbox
    }

    @DynamicPropertySource
    static void queue(DynamicPropertyRegistry r) {
        r.add("app.events.transport", () -> "sqs");
        r.add("app.events.queue-prefix", () -> PREFIX);
        r.add("app.events.sqs.endpoint", () -> "http://" + ELASTICMQ.getHost() + ":" + ELASTICMQ.getMappedPort(9324));
        r.add("app.events.sqs.access-key", () -> "x");
        r.add("app.events.sqs.secret-key", () -> "x");
        r.add("app.events.sqs.create-queues", () -> "false");
    }

    @AfterAll
    static void stop() { sqs.close(); }

    @Autowired IncompleteEventPublications incomplete;
    @Autowired JdbcClient jdbc;

    static String queueUrl(String name) { return sqs.getQueueUrl(r -> r.queueName(PREFIX + name)).queueUrl(); }

    /** Lê a fila até achar uma mensagem que satisfaz a condição (a entrega é assíncrona, depois do commit). */
    static Message await(String queue, Predicate<Message> match) throws InterruptedException {
        List<Message> seen = new ArrayList<>();
        long until = System.currentTimeMillis() + 15_000;
        while (System.currentTimeMillis() < until) {
            for (Message m : sqs.receiveMessage(r -> r.queueUrl(queueUrl(queue)).maxNumberOfMessages(10).waitTimeSeconds(1)
                    .messageAttributeNames("All")).messages()) {
                seen.add(m);
                if (match.test(m)) return m;
            }
        }
        throw new AssertionError("mensagem não chegou em " + queue + "; vistas: " + seen.stream().map(Message::body).toList());
    }

    @Test
    void bookingGoesToTheAppointmentQueue() throws Exception {
        String pro = newProfessional("Fila " + System.nanoTime(), "UNHA", null, null);
        StringBuilder days = new StringBuilder("[");
        for (int d = 0; d <= 6; d++) days.append(d > 0 ? "," : "").append("{'weekday':%d,'start':'08:00','end':'20:00'}".formatted(d));
        send("PUT", "/me/work-hours", json(days.append("]").toString()), pro, 200);
        String svc = read(postJson("/me/services", json("{'name':'Gel','niche':'UNHA','durationMin':60,'priceCents':10000,'depositPercent':30,'returnIntervalDays':21}"), pro, 201), "$.id");
        LocalDate day = LocalDate.now(ZoneId.of("America/Sao_Paulo")).plusWeeks(1).with(TemporalAdjusters.next(DayOfWeek.TUESDAY));
        String starts = ZonedDateTime.of(day.getYear(), day.getMonthValue(), day.getDayOfMonth(), 10, 0, 0, 0, ZoneId.of("America/Sao_Paulo")).toInstant().toString();
        String id = read(postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s'}", svc, starts), newClient(), 201), "$.id");

        Message m = await("appointment-events", x -> x.body().contains(id));
        String body = m.body();
        assertThat(read(body, "$.type")).isEqualTo("AppointmentEvent");
        assertThat(read(body, "$.version")).isEqualTo("1");
        assertThat(read(body, "$.key")).isEqualTo(id);
        assertThat(read(body, "$.data.kind")).isEqualTo("CREATED");
        assertThat(read(body, "$.data.appointmentId")).isEqualTo(id);
        assertThat(read(body, "$.id")).isEqualTo(read(body, "$.data.eventId"));
        assertThat(m.messageAttributes().get("type").stringValue()).isEqualTo("AppointmentEvent");
    }

    @Test
    void outboxKeepsTheEventUntilTheQueueIsBack() throws Exception {
        String token = newClient();
        String accountId = read(getJson("/me", token), "$.accountId");
        send("DELETE", "/me", null, token, 204);

        // a fila não existe: o envio falha e o evento fica pendente na tabela event_publication
        Thread.sleep(2_000);
        assertThat(pending(accountId)).isEqualTo(1);
        try {
            queueUrl("account-events");
            throw new AssertionError("a fila não deveria existir ainda");
        } catch (QueueDoesNotExistException expected) {
            // ok
        }

        // a fila volta: o reenvio (o job faz isso a cada minuto) entrega o mesmo evento
        sqs.createQueue(r -> r.queueName(PREFIX + "account-events"));
        incomplete.resubmitIncompletePublicationsOlderThan(Duration.ZERO);
        Message m = await("account-events", x -> x.body().contains(accountId));
        assertThat(read(m.body(), "$.type")).isEqualTo("AccountDeleted");
        assertThat(read(m.body(), "$.key")).isEqualTo(accountId);

        long until = System.currentTimeMillis() + 5_000;
        while (pending(accountId) > 0 && System.currentTimeMillis() < until) Thread.sleep(200);
        assertThat(pending(accountId)).isZero();
    }

    private int pending(String accountId) {
        return jdbc.sql("""
                SELECT count(*) FROM event_publication
                 WHERE completion_date IS NULL AND event_type LIKE '%AccountDeleted' AND serialized_event LIKE :id""")
                .param("id", "%" + accountId + "%").query(Integer.class).single();
    }
}
