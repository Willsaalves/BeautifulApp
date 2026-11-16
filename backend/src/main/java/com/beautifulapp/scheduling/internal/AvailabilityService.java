package com.beautifulapp.scheduling.internal;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.scheduling.SchedulingApi;
import com.beautifulapp.scheduling.WorkDay;
import com.beautifulapp.scheduling.internal.SchedulingDtos.Slot;
import com.beautifulapp.scheduling.internal.SchedulingDtos.SlotStatus;

/** Horários do dia em passos de 30 min: expediente − bloqueios − agendamentos ativos. */
@Service
class AvailabilityService implements SchedulingApi {
    static final Duration STEP = Duration.ofMinutes(30);

    private final WorkHoursRepository workHours;
    private final TimeBlockRepository blocks;
    private final AppointmentRepository appointments;
    private final Clock clock;
    final ZoneId zone;

    AvailabilityService(WorkHoursRepository workHours, TimeBlockRepository blocks, AppointmentRepository appointments, Clock clock,
                        @Value("${app.scheduling.zone:America/Sao_Paulo}") String zone) {
        this.workHours = workHours;
        this.blocks = blocks;
        this.appointments = appointments;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkDay> workHours(UUID professionalId) {
        return workHours.findByProfessionalIdOrderByWeekday(professionalId).stream()
                .map(w -> new WorkDay(w.weekday, w.start, w.end)).toList();
    }

    static int weekday(LocalDate date) {
        return date.getDayOfWeek().getValue() % 7; // segunda=1 … domingo=0
    }

    Optional<WorkHours> hoursOn(UUID pro, LocalDate date) {
        return workHours.findById(new WorkHours.Key(pro, (short) weekday(date)));
    }

    @Transactional(readOnly = true)
    List<Slot> slots(UUID pro, LocalDate date, int durationMin) {
        var wh = hoursOn(pro, date);
        if (wh.isEmpty()) return List.of();
        Instant open = ZonedDateTime.of(date, wh.get().start, zone).toInstant();
        Instant close = ZonedDateTime.of(date, wh.get().end, zone).toInstant();
        var busy = busyIntervals(pro, open, close, null);
        Duration dur = Duration.ofMinutes(durationMin);
        Instant now = clock.instant();
        List<Slot> out = new ArrayList<>();
        for (Instant t = open; !t.plus(dur).isAfter(close); t = t.plus(STEP)) {
            Instant end = t.plus(dur);
            SlotStatus st = t.isBefore(now) ? SlotStatus.PAST : overlaps(busy, t, end) ? SlotStatus.BUSY : SlotStatus.FREE;
            out.add(new Slot(t, end, st));
        }
        return out;
    }

    /** Valida se [start, end) cabe no expediente e não colide com nada (o banco ainda garante na gravação). */
    @Transactional(readOnly = true)
    Optional<String> conflict(UUID pro, Instant start, Instant end, UUID ignoreAppointment) {
        if (!start.isAfter(clock.instant())) return Optional.of("Escolha um horário no futuro.");
        LocalDate day = start.atZone(zone).toLocalDate();
        var wh = hoursOn(pro, day);
        if (wh.isEmpty()) return Optional.of("A profissional não atende neste dia.");
        Instant open = ZonedDateTime.of(day, wh.get().start, zone).toInstant();
        Instant close = ZonedDateTime.of(day, wh.get().end, zone).toInstant();
        if (start.isBefore(open) || end.isAfter(close)) return Optional.of("Horário fora do expediente da profissional.");
        if (overlaps(busyIntervals(pro, start, end, ignoreAppointment), start, end)) return Optional.of("Esse horário acabou de ser ocupado. Escolha outro.");
        return Optional.empty();
    }

    private List<Instant[]> busyIntervals(UUID pro, Instant from, Instant to, UUID ignore) {
        List<Instant[]> busy = new ArrayList<>();
        appointments.overlapping(pro, from, to, AppointmentStatus.ACTIVE).stream()
                .filter(a -> !a.id.equals(ignore))
                .forEach(a -> busy.add(new Instant[] {a.startsAt, a.endsAt}));
        blocks.overlapping(pro, from, to).forEach(b -> busy.add(new Instant[] {b.startsAt, b.endsAt}));
        return busy;
    }

    private static boolean overlaps(List<Instant[]> busy, Instant s, Instant e) {
        return busy.stream().anyMatch(b -> s.isBefore(b[1]) && e.isAfter(b[0]));
    }
}
