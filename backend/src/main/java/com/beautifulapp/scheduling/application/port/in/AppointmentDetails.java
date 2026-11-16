package com.beautifulapp.scheduling.application.port.in;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.beautifulapp.scheduling.domain.Appointment;

/** Agendamento pronto para mostrar: estado do domínio + dados das participantes + links dos arquivos. */
public record AppointmentDetails(Appointment.State state, Client client, Professional professional, int returnIntervalDays,
                                 String receiptUrl, String referenceUrl) {
    public record Client(UUID accountId, String name, String photoUrl, String phone) {}
    public record Professional(UUID id, String studio, String photoUrl, String neighborhood, String city, String pixKey) {}

    public UUID id() { return state.id(); }
    public long totalCents() { return state.priceCents() - state.discountCents(); }
    public int durationMin() { return (int) java.time.Duration.between(state.startsAt(), state.endsAt()).toMinutes(); }
    public List<com.beautifulapp.scheduling.domain.Selection> selections() { return state.selections(); }
    public Instant createdAt() { return state.createdAt(); }
}
