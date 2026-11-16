package com.beautifulapp.scheduling.application.port.in;

import java.util.Optional;
import java.util.UUID;

import com.beautifulapp.scheduling.domain.Appointment;

/** Consultas usadas por outros módulos (via SchedulingApi). */
public interface AppointmentQueries {
    Optional<Appointment> find(UUID appointmentId);

    boolean hasCompletedWith(UUID clientAccountId, UUID professionalId);
}
