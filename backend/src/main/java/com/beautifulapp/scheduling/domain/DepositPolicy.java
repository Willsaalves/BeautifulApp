package com.beautifulapp.scheduling.domain;

import java.time.Duration;
import java.time.Instant;

/** Prazo do sinal: X horas após agendar, nunca depois de 1h antes do horário; no mínimo 10 min para pagar. */
public final class DepositPolicy {
    private DepositPolicy() {}

    public static Instant deadline(Instant now, Instant start, int hours) {
        Instant due = now.plus(Duration.ofHours(hours));
        Instant latest = start.minus(Duration.ofHours(1));
        if (due.isAfter(latest)) due = latest;
        Instant minimum = now.plus(Duration.ofMinutes(10));
        if (due.isBefore(minimum)) due = minimum.isBefore(start) ? minimum : start;
        return due;
    }

    /** Comprovante recusado: a cliente ganha pelo menos 2h a mais (sem passar do horário). */
    public static Instant extendedAfterRejection(Instant current, Instant now, Instant start) {
        Instant extended = now.plus(Duration.ofHours(2));
        if (current != null && !current.isBefore(extended)) return current;
        return extended.isBefore(start) ? extended : start;
    }
}
