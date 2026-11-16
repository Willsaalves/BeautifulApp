package com.beautifulapp.scheduling.application.port.in;

import java.util.List;
import java.util.UUID;

/** Casos de uso da cliente. */
public interface ClientAppointments {
    AppointmentDetails book(BookAppointmentCommand command);

    AppointmentDetails attachReceipt(UUID clientAccountId, UUID appointmentId, String receiptKey);

    AppointmentDetails respondAdjustment(UUID clientAccountId, UUID appointmentId, boolean accept);

    List<AppointmentDetails> mine(UUID clientAccountId);
}
