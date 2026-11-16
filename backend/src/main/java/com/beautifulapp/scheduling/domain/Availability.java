package com.beautifulapp.scheduling.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Horários do dia em passos de 30 min: expediente − bloqueios − agendamentos ativos. Funções puras. */
public final class Availability {
    public static final Duration STEP = Duration.ofMinutes(30);

    public enum SlotStatus { FREE, BUSY, PAST }

    public record Slot(Instant start, Instant end, SlotStatus status) {}

    private Availability() {}

    public static List<Slot> slots(Interval openHours, List<Interval> busy, Duration duration, Instant now) {
        List<Slot> out = new ArrayList<>();
        for (Instant t = openHours.start(); !t.plus(duration).isAfter(openHours.end()); t = t.plus(STEP)) {
            Instant end = t.plus(duration);
            Instant s = t;
            SlotStatus st = t.isBefore(now) ? SlotStatus.PAST : busy.stream().anyMatch(b -> b.overlaps(s, end)) ? SlotStatus.BUSY : SlotStatus.FREE;
            out.add(new Slot(t, end, st));
        }
        return out;
    }

    /** Por que [start, end) não pode ser agendado (vazio = pode). O banco ainda garante na gravação. */
    public static Optional<String> conflict(Instant start, Instant end, Instant now, Optional<Interval> openHours, List<Interval> busy) {
        if (!start.isAfter(now)) return Optional.of("Escolha um horário no futuro.");
        if (openHours.isEmpty()) return Optional.of("A profissional não atende neste dia.");
        if (start.isBefore(openHours.get().start()) || end.isAfter(openHours.get().end())) return Optional.of("Horário fora do expediente da profissional.");
        if (busy.stream().anyMatch(b -> b.overlaps(start, end))) return Optional.of("Esse horário acabou de ser ocupado. Escolha outro.");
        return Optional.empty();
    }
}
