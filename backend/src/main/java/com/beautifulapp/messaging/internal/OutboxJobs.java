package com.beautifulapp.messaging.internal;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.modulith.events.CompletedEventPublications;
import org.springframework.modulith.events.IncompleteEventPublications;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Manutenção do outbox: reenvia o que ficou pendente (fila fora do ar) e limpa o que já foi entregue. */
@Component
@ConditionalOnProperty(name = "app.scheduling.jobs", havingValue = "true", matchIfMissing = true)
class OutboxJobs {
    private static final Logger log = LoggerFactory.getLogger(OutboxJobs.class);

    private final IncompleteEventPublications incomplete;
    private final CompletedEventPublications completed;

    OutboxJobs(IncompleteEventPublications incomplete, CompletedEventPublications completed) {
        this.incomplete = incomplete;
        this.completed = completed;
    }

    @Scheduled(fixedDelayString = "${app.events.retry-interval:60000}", initialDelay = 30_000)
    void resubmitPending() {
        incomplete.resubmitIncompletePublicationsOlderThan(Duration.ofMinutes(1));
    }

    @Scheduled(cron = "0 15 4 * * *")
    void purgeDelivered() {
        completed.deletePublicationsOlderThan(Duration.ofDays(7));
        log.debug("Outbox: publicações entregues há mais de 7 dias removidas");
    }
}
