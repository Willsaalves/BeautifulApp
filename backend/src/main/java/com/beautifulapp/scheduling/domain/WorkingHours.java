package com.beautifulapp.scheduling.domain;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

/** Expediente de um dia da semana (0 = domingo … 6 = sábado). */
public record WorkingHours(int weekday, LocalTime start, LocalTime end) {

    public static int weekdayOf(LocalDate date) {
        return date.getDayOfWeek().getValue() % 7; // segunda=1 … domingo=0
    }

    /** Abertura e fechamento num dia concreto, no fuso do estúdio. */
    public Interval on(LocalDate date, ZoneId zone) {
        return new Interval(ZonedDateTime.of(date, start, zone).toInstant(), ZonedDateTime.of(date, end, zone).toInstant());
    }

    /** A semana inteira precisa ter no máximo um horário por dia, e o fim depois do início. */
    public static void validateWeek(List<WorkingHours> week) {
        if (week.stream().map(WorkingHours::weekday).distinct().count() != week.size()) {
            throw SchedulingException.invalid("WORKDAY_DUPLICATED", "Cada dia da semana só pode aparecer uma vez.");
        }
        for (WorkingHours d : week) {
            if (!d.end().isAfter(d.start())) throw SchedulingException.invalid("WORKDAY_INVALID", "O fim do expediente precisa ser depois do início.");
        }
    }
}
