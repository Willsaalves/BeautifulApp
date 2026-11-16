package com.beautifulapp.scheduling.application.port.in;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.beautifulapp.scheduling.domain.Availability.Slot;
import com.beautifulapp.scheduling.domain.TimeBlock;
import com.beautifulapp.scheduling.domain.WorkingHours;

/** Expediente, bloqueios e horários livres. */
public interface ManageSchedule {
    List<WorkingHours> week(UUID professionalId);

    List<WorkingHours> replaceWeek(UUID professionalId, List<WorkingHours> week);

    List<TimeBlock> futureBlocks(UUID professionalId);

    TimeBlock addBlock(UUID professionalId, Instant startsAt, Instant endsAt, String reason);

    void removeBlock(UUID professionalId, UUID blockId);

    /** Horários do dia para um serviço da profissional. */
    List<Slot> slots(UUID professionalId, UUID serviceId, LocalDate date);
}
