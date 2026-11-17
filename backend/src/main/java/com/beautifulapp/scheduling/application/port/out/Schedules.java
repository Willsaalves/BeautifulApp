package com.beautifulapp.scheduling.application.port.out;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.beautifulapp.scheduling.domain.TimeBlock;
import com.beautifulapp.scheduling.domain.WorkingHours;

/** Expediente semanal e bloqueios da profissional. */
public interface Schedules {
    Optional<WorkingHours> hoursOn(UUID professionalId, int weekday);

    List<WorkingHours> week(UUID professionalId);

    void replaceWeek(UUID professionalId, List<WorkingHours> week);

    List<TimeBlock> blocksOverlapping(UUID professionalId, Instant from, Instant to);

    void addBlock(TimeBlock block);

    Optional<TimeBlock> block(UUID id);

    void removeBlock(UUID id);
}
