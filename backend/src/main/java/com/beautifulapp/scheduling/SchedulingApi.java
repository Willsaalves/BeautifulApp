package com.beautifulapp.scheduling;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SchedulingApi {
    List<WorkDay> workHours(UUID professionalId);

    Optional<AppointmentInfo> appointment(UUID appointmentId);

    /** A cliente já foi atendida (atendimento concluído) por essa profissional? */
    boolean hasCompletedWith(UUID clientAccountId, UUID professionalId);
}
