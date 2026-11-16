package com.beautifulapp.scheduling.application.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.common.Ids;
import com.beautifulapp.scheduling.application.port.in.ManageSchedule;
import com.beautifulapp.scheduling.application.port.out.Appointments;
import com.beautifulapp.scheduling.application.port.out.Schedules;
import com.beautifulapp.scheduling.application.port.out.ServiceCatalog;
import com.beautifulapp.scheduling.domain.Availability;
import com.beautifulapp.scheduling.domain.Availability.Slot;
import com.beautifulapp.scheduling.domain.Interval;
import com.beautifulapp.scheduling.domain.SchedulingException;
import com.beautifulapp.scheduling.domain.TimeBlock;
import com.beautifulapp.scheduling.domain.WorkingHours;

@Service
class ScheduleService implements ManageSchedule {
    private final Schedules schedules;
    private final Appointments appointments;
    private final ServiceCatalog catalog;
    private final Clock clock;
    private final ZoneId zone;

    ScheduleService(Schedules schedules, Appointments appointments, ServiceCatalog catalog, Clock clock,
                    @Value("${app.scheduling.zone:America/Sao_Paulo}") String zone) {
        this.schedules = schedules;
        this.appointments = appointments;
        this.catalog = catalog;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkingHours> week(UUID professionalId) { return schedules.week(professionalId); }

    @Override
    @Transactional
    public List<WorkingHours> replaceWeek(UUID professionalId, List<WorkingHours> week) {
        WorkingHours.validateWeek(week);
        schedules.replaceWeek(professionalId, week);
        return schedules.week(professionalId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TimeBlock> futureBlocks(UUID professionalId) {
        Instant now = clock.instant();
        return schedules.blocksOverlapping(professionalId, now, now.plus(Duration.ofDays(365)));
    }

    @Override
    @Transactional
    public TimeBlock addBlock(UUID professionalId, Instant startsAt, Instant endsAt, String reason) {
        TimeBlock b = TimeBlock.create(Ids.newId(), professionalId, startsAt, endsAt, reason, clock.instant());
        schedules.addBlock(b);
        return b;
    }

    @Override
    @Transactional
    public void removeBlock(UUID professionalId, UUID blockId) {
        schedules.block(blockId).filter(b -> b.professionalId().equals(professionalId)).ifPresent(b -> schedules.removeBlock(b.id()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Slot> slots(UUID professionalId, UUID serviceId, LocalDate date) {
        var svc = catalog.activeService(serviceId).filter(s -> s.professionalId().equals(professionalId))
                .orElseThrow(() -> SchedulingException.notFound("SERVICE_NOT_FOUND", "Serviço não encontrado."));
        var hours = schedules.hoursOn(professionalId, WorkingHours.weekdayOf(date));
        if (hours.isEmpty()) return List.of();
        Interval open = hours.get().on(date, zone);
        return Availability.slots(open, busy(professionalId, open.start(), open.end(), null), Duration.ofMinutes(svc.durationMin()), clock.instant());
    }

    /** Por que [start, end) não pode ser agendado (vazio = pode). */
    @Transactional(readOnly = true)
    Optional<String> conflict(UUID professionalId, Instant start, Instant end) {
        LocalDate day = start.atZone(zone).toLocalDate();
        var open = schedules.hoursOn(professionalId, WorkingHours.weekdayOf(day)).map(h -> h.on(day, zone));
        return Availability.conflict(start, end, clock.instant(), open, busy(professionalId, start, end, null));
    }

    private List<Interval> busy(UUID professionalId, Instant from, Instant to, UUID ignore) {
        List<Interval> busy = new ArrayList<>(appointments.busy(professionalId, from, to, ignore));
        schedules.blocksOverlapping(professionalId, from, to).forEach(b -> busy.add(b.interval()));
        return busy;
    }
}
