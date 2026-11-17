package com.beautifulapp.scheduling.application.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.common.Ids;
import com.beautifulapp.scheduling.application.port.in.*;
import com.beautifulapp.scheduling.application.port.out.*;
import com.beautifulapp.scheduling.domain.Appointment;
import com.beautifulapp.scheduling.domain.Appointment.Party;
import com.beautifulapp.scheduling.domain.DesignOffer;
import com.beautifulapp.scheduling.domain.Quote;
import com.beautifulapp.scheduling.domain.SchedulingException;
import com.beautifulapp.scheduling.domain.ServiceOffer;

/** Casos de uso do agendamento: carrega o agregado, pede a mudança ao domínio, salva e publica os eventos. */
@Service
class AppointmentService implements ClientAppointments, ProfessionalAppointments, SharedAppointments, AppointmentHousekeeping, AppointmentQueries {
    private final Appointments appointments;
    private final ScheduleService schedule;
    private final ServiceCatalog catalog;
    private final Participants participants;
    private final Files files;
    private final Vouchers vouchers;
    private final BlockList blockList;
    private final EventPublisher events;
    private final Clock clock;

    AppointmentService(Appointments appointments, ScheduleService schedule, ServiceCatalog catalog, Participants participants, Files files,
                       Vouchers vouchers, BlockList blockList, EventPublisher events, Clock clock) {
        this.appointments = appointments;
        this.schedule = schedule;
        this.catalog = catalog;
        this.participants = participants;
        this.files = files;
        this.vouchers = vouchers;
        this.blockList = blockList;
        this.events = events;
        this.clock = clock;
    }

    // ---------- cliente ----------

    @Override
    @Transactional
    public AppointmentDetails book(BookAppointmentCommand c) {
        if (!participants.hasClientProfile(c.clientAccountId())) {
            throw SchedulingException.forbidden("NOT_CLIENT", "Crie seu perfil de cliente para agendar.");
        }
        ServiceOffer svc = catalog.activeService(c.serviceId())
                .orElseThrow(() -> SchedulingException.notFound("SERVICE_NOT_FOUND", "Serviço não encontrado."));
        var pro = participants.professional(svc.professionalId())
                .orElseThrow(() -> SchedulingException.notFound("PROFESSIONAL_NOT_FOUND", "Profissional não encontrada."));
        if (!pro.active()) {
            throw SchedulingException.forbidden("PROFESSIONAL_UNAVAILABLE", "Esta profissional não está recebendo agendamentos.");
        }
        if (blockList.blockedBetween(c.clientAccountId(), pro.accountId())) {
            throw SchedulingException.forbidden("BLOCKED", "Não é possível agendar com esta profissional.");
        }
        Instant end = c.startsAt().plus(Duration.ofMinutes(svc.durationMin()));
        schedule.conflict(svc.professionalId(), c.startsAt(), end).ifPresent(msg -> { throw SchedulingException.slotUnavailable(msg); });

        DesignOffer design = c.designId() == null ? null : catalog.design(c.designId())
                .orElseThrow(() -> SchedulingException.invalid("DESIGN_INVALID", "Esse design não é deste serviço."));
        String reference = files.ownedReference(c.clientAccountId(), c.referenceKey());
        Quote quote = Quote.of(svc, c.selections() == null ? Map.of() : c.selections(), design, reference);

        UUID id = Ids.newId();
        // mesma transação: se o horário falhar ao gravar, o voucher não é consumido
        int discount = c.voucherId() == null ? 0 : vouchers.redeem(c.clientAccountId(), svc.professionalId(), c.voucherId(), id);
        Appointment a = Appointment.book(id, c.clientAccountId(), quote, c.startsAt(), c.notes(), discount, pro.depositDeadlineHours(), clock.instant());
        appointments.add(a);
        events.publish(a.pullEvents());
        return details(a);
    }

    @Override
    @Transactional
    public AppointmentDetails attachReceipt(UUID clientAccountId, UUID appointmentId, String receiptKey) {
        Appointment a = ofClient(clientAccountId, appointmentId);
        a.attachReceipt(files.ownedReceipt(clientAccountId, receiptKey), clock.instant());
        return save(a);
    }

    @Override
    @Transactional
    public AppointmentDetails respondAdjustment(UUID clientAccountId, UUID appointmentId, boolean accept) {
        Appointment a = ofClient(clientAccountId, appointmentId);
        a.respondAdjustment(accept, clock.instant());
        return save(a);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentDetails> mine(UUID clientAccountId) {
        return appointments.ofClient(clientAccountId, 100).stream().map(this::details).toList();
    }

    // ---------- profissional ----------

    @Override
    @Transactional
    public AppointmentDetails confirmDeposit(UUID professionalId, UUID appointmentId) {
        Appointment a = ofProfessional(professionalId, appointmentId);
        a.confirmDeposit(clock.instant());
        return save(a);
    }

    @Override
    @Transactional
    public AppointmentDetails rejectReceipt(UUID professionalId, UUID appointmentId) {
        Appointment a = ofProfessional(professionalId, appointmentId);
        a.rejectReceipt(clock.instant());
        return save(a);
    }

    @Override
    @Transactional
    public AppointmentDetails proposeAdjustment(UUID professionalId, UUID appointmentId, long newPriceCents, String note) {
        Appointment a = ofProfessional(professionalId, appointmentId);
        a.proposeAdjustment(newPriceCents, note, clock.instant());
        return save(a);
    }

    @Override
    @Transactional
    public AppointmentDetails complete(UUID professionalId, UUID appointmentId) {
        Appointment a = ofProfessional(professionalId, appointmentId);
        a.complete(clock.instant());
        return save(a);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentDetails> agenda(UUID professionalId, Instant from, Instant to) {
        return appointments.agendaOf(professionalId, from, to).stream().map(this::details).toList();
    }

    // ---------- as duas partes ----------

    @Override
    @Transactional(readOnly = true)
    public AppointmentDetails get(UUID accountId, UUID appointmentId) {
        Appointment a = load(appointmentId);
        if (partyOf(accountId, a).isEmpty()) throw SchedulingException.notFound();
        return details(a);
    }

    @Override
    @Transactional
    public AppointmentDetails cancel(UUID accountId, UUID appointmentId) {
        Appointment a = load(appointmentId);
        Party by = partyOf(accountId, a).orElseThrow(SchedulingException::notFound);
        if (a.cancel(by, clock.instant())) vouchers.release(a.id());
        return save(a);
    }

    // ---------- sistema ----------

    @Override
    @Transactional
    public int expireOverdueDeposits() {
        Instant now = clock.instant();
        var overdue = appointments.awaitingDepositDueBefore(now);
        for (Appointment a : overdue) {
            if (a.usesVoucher()) vouchers.release(a.id());
            a.expire(now);
            save(a);
        }
        return overdue.size();
    }

    @Override
    @Transactional
    public int remindDepositsDueSoon() {
        Instant now = clock.instant();
        var soon = appointments.awaitingDepositDueBetweenNotReminded(now, now.plus(Duration.ofHours(1)));
        for (Appointment a : soon) {
            a.remindDeposit(now);
            save(a);
        }
        return soon.size();
    }

    @Override
    @Transactional
    public void cancelAllOf(UUID accountId) {
        UUID pro = participants.professionalIdOf(accountId).orElse(null);
        for (Appointment a : appointments.activeOf(accountId, pro)) {
            if (a.cancel(a.isClient(accountId) ? Party.CLIENT : Party.PROFESSIONAL, clock.instant())) vouchers.release(a.id());
            save(a);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Appointment> find(UUID appointmentId) { return appointments.byId(appointmentId); }

    @Override
    @Transactional(readOnly = true)
    public boolean hasCompletedWith(UUID clientAccountId, UUID professionalId) {
        return appointments.hasCompleted(clientAccountId, professionalId);
    }

    // ---------- apoio ----------

    private AppointmentDetails save(Appointment a) {
        appointments.update(a);
        events.publish(a.pullEvents());
        return details(a);
    }

    private Appointment load(UUID id) {
        return appointments.byId(id).orElseThrow(SchedulingException::notFound);
    }

    private Appointment ofClient(UUID clientAccountId, UUID id) {
        Appointment a = load(id);
        if (!a.isClient(clientAccountId)) throw SchedulingException.notFound();
        return a;
    }

    private Appointment ofProfessional(UUID professionalId, UUID id) {
        Appointment a = load(id);
        if (!a.isOfProfessional(professionalId)) throw SchedulingException.notFound();
        return a;
    }

    private Optional<Party> partyOf(UUID accountId, Appointment a) {
        if (a.isClient(accountId)) return Optional.of(Party.CLIENT);
        return participants.professionalIdOf(accountId).filter(a::isOfProfessional).map(x -> Party.PROFESSIONAL);
    }

    private AppointmentDetails details(Appointment a) {
        var s = a.state();
        return new AppointmentDetails(s,
                participants.client(s.clientAccountId())
                        .map(c -> new AppointmentDetails.Client(c.accountId(), c.name(), c.photoUrl(), c.phone())).orElse(null),
                participants.professional(s.professionalId())
                        .map(p -> new AppointmentDetails.Professional(p.professionalId(), p.studio(), p.photoUrl(), p.neighborhood(), p.city(), p.pixKey()))
                        .orElse(null),
                catalog.activeService(s.serviceId()).map(ServiceOffer::returnIntervalDays).orElse(0),
                files.readUrl(s.receiptKey()), files.readUrl(s.referenceKey()));
    }
}
