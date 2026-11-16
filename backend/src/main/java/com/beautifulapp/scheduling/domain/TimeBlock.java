package com.beautifulapp.scheduling.domain;

import java.time.Instant;
import java.util.UUID;

/** Período bloqueado pela profissional (almoço, folga, férias). */
public record TimeBlock(UUID id, UUID professionalId, Instant startsAt, Instant endsAt, String reason, Instant createdAt) {
    public static TimeBlock create(UUID id, UUID professionalId, Instant startsAt, Instant endsAt, String reason, Instant now) {
        if (!endsAt.isAfter(startsAt)) throw SchedulingException.invalid("BLOCK_INVALID", "O fim precisa ser depois do início.");
        return new TimeBlock(id, professionalId, startsAt, endsAt, reason, now);
    }

    public Interval interval() { return new Interval(startsAt, endsAt); }
}
