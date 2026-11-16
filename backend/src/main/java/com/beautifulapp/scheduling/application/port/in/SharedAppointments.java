package com.beautifulapp.scheduling.application.port.in;

import java.util.UUID;

/** Casos de uso de qualquer uma das duas partes do agendamento. */
public interface SharedAppointments {
    /** Detalhe, para a cliente ou a profissional do agendamento (404 para os outros). */
    AppointmentDetails get(UUID accountId, UUID appointmentId);

    AppointmentDetails cancel(UUID accountId, UUID appointmentId);
}
