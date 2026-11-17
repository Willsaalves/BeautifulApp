package com.beautifulapp.scheduling.adapter.out.persistence;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import com.beautifulapp.scheduling.application.port.out.Appointments;
import com.beautifulapp.scheduling.domain.Appointment;
import com.beautifulapp.scheduling.domain.AppointmentStatus;
import com.beautifulapp.scheduling.domain.Interval;
import com.beautifulapp.scheduling.domain.SchedulingException;
import com.beautifulapp.scheduling.domain.Selection;

/** Porta Appointments sobre JPA: converte domínio ⇄ linha da tabela. */
@Component
class JpaAppointments implements Appointments {
    private final AppointmentRows rows;

    JpaAppointments(AppointmentRows rows) { this.rows = rows; }

    @Override
    public Optional<Appointment> byId(UUID id) { return rows.findById(id).map(JpaAppointments::toDomain); }

    @Override
    public void add(Appointment a) {
        try {
            rows.saveAndFlush(copy(a.state(), new AppointmentRow(a.id())));
        } catch (DataIntegrityViolationException e) {
            // pedido simultâneo pegou o mesmo horário: a exclusion constraint do banco barrou
            throw SchedulingException.slotUnavailable("Esse horário acabou de ser ocupado. Escolha outro.");
        }
    }

    @Override
    public void update(Appointment a) {
        // a linha já está no contexto de persistência (carregada na mesma transação): o versionamento otimista vale
        AppointmentRow row = rows.findById(a.id()).orElseThrow(SchedulingException::notFound);
        copy(a.state(), row);
    }

    @Override
    public List<Appointment> ofClient(UUID clientAccountId, int limit) {
        return rows.findTop100ByClientAccountIdOrderByStartsAtDesc(clientAccountId).stream().limit(limit).map(JpaAppointments::toDomain).toList();
    }

    @Override
    public List<Appointment> agendaOf(UUID professionalId, Instant from, Instant to) {
        return rows.agenda(professionalId, from, to).stream().map(JpaAppointments::toDomain).toList();
    }

    @Override
    public List<Interval> busy(UUID professionalId, Instant from, Instant to, UUID ignore) {
        return rows.overlapping(professionalId, from, to, AppointmentStatus.ACTIVE).stream()
                .filter(r -> !r.id.equals(ignore)).map(r -> new Interval(r.startsAt, r.endsAt)).toList();
    }

    @Override
    public List<Appointment> awaitingDepositDueBefore(Instant moment) {
        return rows.findByStatusAndDepositDueAtBefore(AppointmentStatus.AWAITING_DEPOSIT, moment).stream().map(JpaAppointments::toDomain).toList();
    }

    @Override
    public List<Appointment> awaitingDepositDueBetweenNotReminded(Instant from, Instant to) {
        return rows.findByStatusAndDepositRemindedAtIsNullAndDepositDueAtBetween(AppointmentStatus.AWAITING_DEPOSIT, from, to).stream()
                .map(JpaAppointments::toDomain).toList();
    }

    @Override
    public List<Appointment> activeOf(UUID accountId, UUID professionalIdOrNull) {
        UUID pro = professionalIdOrNull != null ? professionalIdOrNull : new UUID(0, 0);
        return rows.activeOf(accountId, pro, AppointmentStatus.ACTIVE).stream().map(JpaAppointments::toDomain).toList();
    }

    @Override
    public boolean hasCompleted(UUID clientAccountId, UUID professionalId) {
        return rows.existsByClientAccountIdAndProfessionalIdAndStatus(clientAccountId, professionalId, AppointmentStatus.COMPLETED);
    }

    static Appointment toDomain(AppointmentRow r) {
        return Appointment.restore(new Appointment.State(r.id, r.clientAccountId, r.professionalId, r.serviceId, r.serviceName,
                r.designId, r.designName, r.startsAt, r.endsAt, r.status, r.previousStatus, r.priceCents, r.discountCents, r.depositCents,
                r.depositDueAt, r.receiptKey, r.referenceKey, r.notes, r.adjNewPriceCents, r.adjNote, r.adjStatus, r.cancelledBy,
                r.depositRemindedAt, r.createdAt, r.updatedAt,
                r.selections.stream().map(s -> new Selection(s.optionId, s.choiceId, s.optionLabel, s.choiceLabel, s.priceDeltaCents)).toList()));
    }

    private static AppointmentRow copy(Appointment.State s, AppointmentRow r) {
        r.clientAccountId = s.clientAccountId();
        r.professionalId = s.professionalId();
        r.serviceId = s.serviceId();
        r.serviceName = s.serviceName();
        r.designId = s.designId();
        r.designName = s.designName();
        r.startsAt = s.startsAt();
        r.endsAt = s.endsAt();
        r.status = s.status();
        r.previousStatus = s.previousStatus();
        r.priceCents = s.priceCents();
        r.discountCents = s.discountCents();
        r.depositCents = s.depositCents();
        r.depositDueAt = s.depositDueAt();
        r.receiptKey = s.receiptKey();
        r.referenceKey = s.referenceKey();
        r.notes = s.notes();
        r.adjNewPriceCents = s.adjNewPriceCents();
        r.adjNote = s.adjNote();
        r.adjStatus = s.adjStatus();
        r.cancelledBy = s.cancelledBy();
        r.depositRemindedAt = s.depositRemindedAt();
        r.createdAt = s.createdAt();
        r.updatedAt = s.updatedAt();
        if (r.selections.isEmpty() && !s.selections().isEmpty()) {
            s.selections().forEach(x -> r.selections.add(new SelectionRow(x.optionId(), x.choiceId(), x.optionLabel(), x.choiceLabel(), x.priceDeltaCents())));
        }
        return r;
    }
}
