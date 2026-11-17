package com.beautifulapp.scheduling.adapter.out.persistence;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.beautifulapp.scheduling.application.port.out.Schedules;
import com.beautifulapp.scheduling.domain.TimeBlock;
import com.beautifulapp.scheduling.domain.WorkingHours;

@Component
class JpaSchedules implements Schedules {
    private final WorkHoursRows hours;
    private final TimeBlockRows blocks;

    JpaSchedules(WorkHoursRows hours, TimeBlockRows blocks) {
        this.hours = hours;
        this.blocks = blocks;
    }

    @Override
    public Optional<WorkingHours> hoursOn(UUID professionalId, int weekday) {
        return hours.findById(new WorkHoursRow.Key(professionalId, (short) weekday)).map(JpaSchedules::toDomain);
    }

    @Override
    public List<WorkingHours> week(UUID professionalId) {
        return hours.findByProfessionalIdOrderByWeekday(professionalId).stream().map(JpaSchedules::toDomain).toList();
    }

    @Override
    public void replaceWeek(UUID professionalId, List<WorkingHours> week) {
        hours.deleteAllOf(professionalId);
        week.forEach(d -> hours.save(new WorkHoursRow(professionalId, (short) d.weekday(), d.start(), d.end())));
    }

    @Override
    public List<TimeBlock> blocksOverlapping(UUID professionalId, Instant from, Instant to) {
        return blocks.overlapping(professionalId, from, to).stream().map(JpaSchedules::toDomain).toList();
    }

    @Override
    public void addBlock(TimeBlock b) {
        TimeBlockRow r = new TimeBlockRow();
        r.id = b.id();
        r.professionalId = b.professionalId();
        r.startsAt = b.startsAt();
        r.endsAt = b.endsAt();
        r.reason = b.reason();
        r.createdAt = b.createdAt();
        blocks.save(r);
    }

    @Override
    public Optional<TimeBlock> block(UUID id) { return blocks.findById(id).map(JpaSchedules::toDomain); }

    @Override
    public void removeBlock(UUID id) { blocks.deleteById(id); }

    private static WorkingHours toDomain(WorkHoursRow r) { return new WorkingHours(r.weekday, r.start, r.end); }

    private static TimeBlock toDomain(TimeBlockRow r) {
        return new TimeBlock(r.id, r.professionalId, r.startsAt, r.endsAt, r.reason, r.createdAt);
    }
}
