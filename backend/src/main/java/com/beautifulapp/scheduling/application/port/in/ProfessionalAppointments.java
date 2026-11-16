package com.beautifulapp.scheduling.application.port.in;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Casos de uso da profissional (professionalId já resolvido a partir da conta logada). */
public interface ProfessionalAppointments {
    AppointmentDetails confirmDeposit(UUID professionalId, UUID appointmentId);

    AppointmentDetails rejectReceipt(UUID professionalId, UUID appointmentId);

    AppointmentDetails proposeAdjustment(UUID professionalId, UUID appointmentId, long newPriceCents, String note);

    AppointmentDetails complete(UUID professionalId, UUID appointmentId);

    List<AppointmentDetails> agenda(UUID professionalId, Instant from, Instant to);
}
