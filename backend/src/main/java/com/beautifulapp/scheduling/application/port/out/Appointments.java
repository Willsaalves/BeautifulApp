package com.beautifulapp.scheduling.application.port.out;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.beautifulapp.scheduling.domain.Appointment;
import com.beautifulapp.scheduling.domain.Interval;

/** Onde os agendamentos ficam guardados. */
public interface Appointments {
    Optional<Appointment> byId(UUID id);

    /** Grava um agendamento novo. Lança SchedulingException(SLOT_UNAVAILABLE) se outro pedido pegou o horário ao mesmo tempo. */
    void add(Appointment appointment);

    void update(Appointment appointment);

    List<Appointment> ofClient(UUID clientAccountId, int limit);

    List<Appointment> agendaOf(UUID professionalId, Instant from, Instant to);

    /** Períodos ocupados por agendamentos ativos (opcionalmente ignorando um). */
    List<Interval> busy(UUID professionalId, Instant from, Instant to, UUID ignoreAppointmentId);

    List<Appointment> awaitingDepositDueBefore(Instant moment);

    List<Appointment> awaitingDepositDueBetweenNotReminded(Instant from, Instant to);

    /** Agendamentos ativos em que a conta é a cliente ou a profissional. */
    List<Appointment> activeOf(UUID accountId, UUID professionalIdOrNull);

    boolean hasCompleted(UUID clientAccountId, UUID professionalId);
}
