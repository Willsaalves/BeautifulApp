package com.beautifulapp.scheduling.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.beautifulapp.scheduling.domain.AppointmentChanged.Change;

/**
 * Agregado do agendamento. Toda mudança de estado passa por um método daqui, que valida a transição
 * e registra o evento de domínio. Quem salva (porta Appointments) e quem publica os eventos ficam do lado de fora.
 */
public final class Appointment {
    public enum Party { CLIENT, PROFESSIONAL }

    /** Fotografia completa do estado, usada só pelo adaptador de persistência para gravar e reconstruir. */
    public record State(UUID id, UUID clientAccountId, UUID professionalId, UUID serviceId, String serviceName,
                        UUID designId, String designName, Instant startsAt, Instant endsAt,
                        AppointmentStatus status, AppointmentStatus previousStatus,
                        long priceCents, long discountCents, long depositCents, Instant depositDueAt,
                        String receiptKey, String referenceKey, String notes,
                        Long adjNewPriceCents, String adjNote, String adjStatus,
                        String cancelledBy, Instant depositRemindedAt, Instant createdAt, Instant updatedAt,
                        List<Selection> selections) {}

    private final UUID id;
    private final UUID clientAccountId;
    private final UUID professionalId;
    private final UUID serviceId;
    private final String serviceName;
    private final UUID designId;
    private final String designName;
    private final Instant startsAt;
    private final Instant endsAt;
    private AppointmentStatus status;
    private AppointmentStatus previousStatus;
    private long priceCents;
    private final long discountCents;
    private final long depositCents;
    private Instant depositDueAt;
    private String receiptKey;
    private final String referenceKey;
    private final String notes;
    private Long adjNewPriceCents;
    private String adjNote;
    private String adjStatus;
    private String cancelledBy;
    private Instant depositRemindedAt;
    private final Instant createdAt;
    private Instant updatedAt;
    private final List<Selection> selections;

    private final List<AppointmentChanged> events = new ArrayList<>();

    private Appointment(State s) {
        this.id = s.id();
        this.clientAccountId = s.clientAccountId();
        this.professionalId = s.professionalId();
        this.serviceId = s.serviceId();
        this.serviceName = s.serviceName();
        this.designId = s.designId();
        this.designName = s.designName();
        this.startsAt = s.startsAt();
        this.endsAt = s.endsAt();
        this.status = s.status();
        this.previousStatus = s.previousStatus();
        this.priceCents = s.priceCents();
        this.discountCents = s.discountCents();
        this.depositCents = s.depositCents();
        this.depositDueAt = s.depositDueAt();
        this.receiptKey = s.receiptKey();
        this.referenceKey = s.referenceKey();
        this.notes = s.notes();
        this.adjNewPriceCents = s.adjNewPriceCents();
        this.adjNote = s.adjNote();
        this.adjStatus = s.adjStatus();
        this.cancelledBy = s.cancelledBy();
        this.depositRemindedAt = s.depositRemindedAt();
        this.createdAt = s.createdAt();
        this.updatedAt = s.updatedAt();
        this.selections = List.copyOf(s.selections());
    }

    public static Appointment restore(State s) { return new Appointment(s); }

    /**
     * Novo agendamento a partir do orçamento. Com sinal, fica aguardando o comprovante até o prazo;
     * sem sinal, já nasce confirmado.
     */
    public static Appointment book(UUID id, UUID clientAccountId, Quote quote, Instant startsAt, String notes,
                                   int discountPercent, int depositDeadlineHours, Instant now) {
        ServiceOffer svc = quote.service();
        long price = quote.priceCents();
        long discount = Math.round(price * discountPercent / 100.0);
        long deposit = Math.round((price - discount) * svc.depositPercent() / 100.0);
        Instant endsAt = startsAt.plus(Duration.ofMinutes(svc.durationMin()));
        AppointmentStatus status = deposit > 0 ? AppointmentStatus.AWAITING_DEPOSIT : AppointmentStatus.CONFIRMED;
        Instant due = deposit > 0 ? DepositPolicy.deadline(now, startsAt, depositDeadlineHours) : null;
        Appointment a = new Appointment(new State(id, clientAccountId, svc.professionalId(), svc.id(), svc.name(),
                quote.design() == null ? null : quote.design().id(), quote.design() == null ? null : quote.design().name(),
                startsAt, endsAt, status, null, price, discount, deposit, due, null, quote.referenceKey(),
                notes == null || notes.isBlank() ? null : notes.trim(), null, null, null, null, null, now, now, quote.selections()));
        a.record(Change.CREATED);
        return a;
    }

    // ---------- sinal ----------

    public void attachReceipt(String key, Instant now) {
        require(AppointmentStatus.AWAITING_DEPOSIT, AppointmentStatus.RECEIPT_SENT);
        this.receiptKey = key;
        moveTo(AppointmentStatus.RECEIPT_SENT, now);
        record(Change.RECEIPT_SENT);
    }

    public void confirmDeposit(Instant now) {
        require(AppointmentStatus.RECEIPT_SENT);
        moveTo(AppointmentStatus.CONFIRMED, now);
        record(Change.DEPOSIT_CONFIRMED);
    }

    /** Comprovante recusado: volta a aguardar o sinal, com pelo menos 2h a mais para reenviar. */
    public void rejectReceipt(Instant now) {
        require(AppointmentStatus.RECEIPT_SENT);
        this.receiptKey = null;
        this.depositDueAt = DepositPolicy.extendedAfterRejection(depositDueAt, now, startsAt);
        this.depositRemindedAt = null;
        moveTo(AppointmentStatus.AWAITING_DEPOSIT, now);
        record(Change.RECEIPT_REJECTED);
    }

    /** Sinal não pago até o prazo: o horário é liberado. */
    public void expire(Instant now) {
        require(AppointmentStatus.AWAITING_DEPOSIT);
        moveTo(AppointmentStatus.EXPIRED, now);
        record(Change.EXPIRED);
    }

    /** Lembrete único quando falta pouco para o sinal vencer. */
    public void remindDeposit(Instant now) {
        if (depositRemindedAt != null) return;
        this.depositRemindedAt = now;
        this.updatedAt = now;
        record(Change.DEPOSIT_DUE_SOON);
    }

    // ---------- ajuste de valor ----------

    public void proposeAdjustment(long newPriceCents, String note, Instant now) {
        require(AppointmentStatus.AWAITING_DEPOSIT, AppointmentStatus.RECEIPT_SENT, AppointmentStatus.CONFIRMED);
        this.previousStatus = status;
        this.adjNewPriceCents = newPriceCents;
        this.adjNote = note == null || note.isBlank() ? null : note.trim();
        this.adjStatus = "PENDING";
        moveTo(AppointmentStatus.ADJUSTMENT_PENDING, now);
        record(Change.ADJUSTMENT_PROPOSED);
    }

    public void respondAdjustment(boolean accept, Instant now) {
        require(AppointmentStatus.ADJUSTMENT_PENDING);
        if (accept) this.priceCents = adjNewPriceCents;
        this.adjStatus = accept ? "ACCEPTED" : "DECLINED";
        AppointmentStatus back = previousStatus != null ? previousStatus : AppointmentStatus.AWAITING_DEPOSIT;
        this.previousStatus = null;
        moveTo(back, now);
        record(accept ? Change.ADJUSTMENT_ACCEPTED : Change.ADJUSTMENT_DECLINED);
    }

    // ---------- fim ----------

    public void complete(Instant now) {
        require(AppointmentStatus.CONFIRMED);
        moveTo(AppointmentStatus.COMPLETED, now);
        record(Change.COMPLETED);
    }

    /** Cancela (cliente ou profissional). Devolve true se havia voucher reservado para liberar. */
    public boolean cancel(Party by, Instant now) {
        if (!status.active()) throw SchedulingException.invalidState(status);
        this.cancelledBy = by.name();
        moveTo(AppointmentStatus.CANCELLED, now);
        record(by == Party.CLIENT ? Change.CANCELLED_BY_CLIENT : Change.CANCELLED_BY_PROFESSIONAL);
        return discountCents > 0;
    }

    public boolean usesVoucher() { return discountCents > 0; }

    // ---------- consultas ----------

    public boolean isClient(UUID accountId) { return clientAccountId.equals(accountId); }
    public boolean isOfProfessional(UUID proId) { return professionalId.equals(proId); }
    public long paidCents() { return priceCents - discountCents; }
    public int durationMin() { return (int) Duration.between(startsAt, endsAt).toMinutes(); }

    public UUID id() { return id; }
    public UUID clientAccountId() { return clientAccountId; }
    public UUID professionalId() { return professionalId; }
    public UUID serviceId() { return serviceId; }
    public String serviceName() { return serviceName; }
    public AppointmentStatus status() { return status; }
    public Instant startsAt() { return startsAt; }
    public Instant endsAt() { return endsAt; }
    public Instant depositDueAt() { return depositDueAt; }

    public State state() {
        return new State(id, clientAccountId, professionalId, serviceId, serviceName, designId, designName, startsAt, endsAt,
                status, previousStatus, priceCents, discountCents, depositCents, depositDueAt, receiptKey, referenceKey, notes,
                adjNewPriceCents, adjNote, adjStatus, cancelledBy, depositRemindedAt, createdAt, updatedAt, selections);
    }

    /** Eventos registrados desde a última retirada (a camada de aplicação publica depois de salvar). */
    public List<AppointmentChanged> pullEvents() {
        List<AppointmentChanged> out = List.copyOf(events);
        events.clear();
        return out;
    }

    // ---------- apoio ----------

    private void require(AppointmentStatus... allowed) {
        for (AppointmentStatus s : allowed) if (status == s) return;
        throw SchedulingException.invalidState(status);
    }

    private void moveTo(AppointmentStatus to, Instant now) {
        this.status = to;
        this.updatedAt = now;
    }

    private void record(Change change) {
        events.add(new AppointmentChanged(change, id, clientAccountId, professionalId, serviceId, serviceName, startsAt, depositDueAt, paidCents(), updatedAt));
    }
}
