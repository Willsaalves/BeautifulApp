package com.beautifulapp.scheduling.domain;

import java.time.Instant;

/** Período [start, end). */
public record Interval(Instant start, Instant end) {
    public boolean overlaps(Instant s, Instant e) { return s.isBefore(end) && e.isAfter(start); }
}
