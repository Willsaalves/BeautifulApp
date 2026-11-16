package com.beautifulapp.scheduling.internal;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.beautifulapp.catalog.CatalogApi;
import com.beautifulapp.catalog.CatalogViews.OptionView;
import com.beautifulapp.catalog.CatalogViews.ServiceView;
import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.Ids;
import com.beautifulapp.loyalty.LoyaltyApi;
import com.beautifulapp.media.MediaApi;
import com.beautifulapp.media.MediaKind;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.profile.PublicProfessional;
import com.beautifulapp.common.AppointmentCompleted;
import com.beautifulapp.scheduling.internal.SchedulingDtos.*;

@Service
class AppointmentService {
    private final AppointmentRepository appointments;
    private final AvailabilityService availability;
    private final CatalogApi catalog;
    private final ProfileApi profiles;
    private final MediaApi media;
    private final LoyaltyApi loyalty;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    AppointmentService(AppointmentRepository appointments, AvailabilityService availability, CatalogApi catalog, ProfileApi profiles,
                       MediaApi media, LoyaltyApi loyalty, ApplicationEventPublisher events, Clock clock) {
        this.appointments = appointments;
        this.availability = availability;
        this.catalog = catalog;
        this.profiles = profiles;
        this.media = media;
        this.loyalty = loyalty;
        this.events = events;
        this.clock = clock;
    }

    // ---------- criação (cliente) ----------

    @Transactional
    AppointmentView create(UUID clientAccountId, CreateAppointment in) {
        profiles.clientSummary(clientAccountId).filter(c -> c.name() != null)
                .orElseThrow(() -> ApiException.forbidden("NOT_CLIENT", "Crie seu perfil de cliente para agendar."));
        ServiceView svc = catalog.activeService(in.serviceId())
                .orElseThrow(() -> ApiException.notFound("SERVICE_NOT_FOUND", "Serviço não encontrado."));
        PublicProfessional pro = profiles.publicProfessional(svc.professionalId()).orElseThrow();

        Instant start = in.startsAt();
        Instant end = start.plus(Duration.ofMinutes(svc.durationMin()));
        availability.conflict(svc.professionalId(), start, end, null)
                .ifPresent(msg -> { throw ApiException.conflict("SLOT_UNAVAILABLE", msg); });

        Appointment a = new Appointment(Ids.newId(), clock.instant());
        a.clientAccountId = clientAccountId;
        a.professionalId = svc.professionalId();
        a.serviceId = svc.id();
        a.serviceName = svc.name();
        a.startsAt = start;
        a.endsAt = end;
        a.notes = StringUtils.hasText(in.notes()) ? in.notes().trim() : null;

        // preço calculado no servidor: base + escolhas + design
        long price = svc.priceCents();
        Map<UUID, UUID> chosen = in.selections() == null ? Map.of()
                : in.selections().stream().collect(Collectors.toMap(SelectionInput::optionId, SelectionInput::choiceId, (x, y) -> y));
        for (OptionView opt : svc.options()) {
            var choices = opt.choices().stream().collect(Collectors.toMap(c -> c.id(), Function.identity()));
            UUID choiceId = chosen.getOrDefault(opt.id(), opt.choices().get(0).id());
            var choice = choices.get(choiceId);
            if (choice == null) throw ApiException.badRequest("CHOICE_INVALID", "Opção inválida para \"%s\".".formatted(opt.label()));
            a.selections.add(new Selection(opt.id(), choice.id(), opt.label(), choice.label(), choice.priceDeltaCents()));
            price += choice.priceDeltaCents();
        }
        if (in.designId() != null) {
            var design = catalog.design(in.designId()).filter(d -> d.serviceId().equals(svc.id()))
                    .orElseThrow(() -> ApiException.badRequest("DESIGN_INVALID", "Esse design não é deste serviço."));
            a.designId = design.id();
            a.designName = design.name();
            price += design.priceDeltaCents();
        }
        String ref = media.normalizeKey(in.referenceKey());
        if (ref != null) {
            media.assertOwned(ref, clientAccountId, MediaKind.REFERENCE);
            a.referenceKey = ref;
        }
        if (svc.requiresReference() && a.referenceKey == null && a.designId == null) {
            throw ApiException.badRequest("REFERENCE_REQUIRED", "Escolha um Trending Design ou anexe sua foto de referência.");
        }

        a.priceCents = price;
        if (in.voucherId() != null) {
            // mesma transação: se o horário falhar, o voucher não é consumido
            int percent = loyalty.redeem(clientAccountId, svc.professionalId(), in.voucherId(), a.id);
            a.discountCents = Math.round(price * percent / 100.0);
        }
        a.depositCents = Math.round((price - a.discountCents) * svc.depositPercent() / 100.0);
        if (a.depositCents > 0) {
            a.status = AppointmentStatus.AWAITING_DEPOSIT;
            a.depositDueAt = depositDeadline(clock.instant(), start, pro.depositDeadlineHours());
        } else {
            a.status = AppointmentStatus.CONFIRMED;
        }
        try {
            appointments.saveAndFlush(a);
        } catch (DataIntegrityViolationException e) {
            // pedido simultâneo pegou o mesmo horário: a exclusion constraint do banco barrou
            throw ApiException.conflict("SLOT_UNAVAILABLE", "Esse horário acabou de ser ocupado. Escolha outro.");
        }
        return view(a);
    }

    /** X horas após agendar, nunca depois de 1h antes do horário; no mínimo 10 min para pagar. */
    static Instant depositDeadline(Instant now, Instant start, int hours) {
        Instant due = now.plus(Duration.ofHours(hours));
        Instant latest = start.minus(Duration.ofHours(1));
        if (due.isAfter(latest)) due = latest;
        Instant minimum = now.plus(Duration.ofMinutes(10));
        if (due.isBefore(minimum)) due = minimum.isBefore(start) ? minimum : start;
        return due;
    }

    // ---------- leitura ----------

    @Transactional(readOnly = true)
    AppointmentView get(UUID accountId, UUID id) {
        Appointment a = load(id);
        if (!a.clientAccountId.equals(accountId) && !isProOf(accountId, a)) throw notFound();
        return view(a);
    }

    @Transactional(readOnly = true)
    List<AppointmentView> mine(UUID clientAccountId) {
        return appointments.findTop100ByClientAccountIdOrderByStartsAtDesc(clientAccountId).stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    List<AppointmentView> agenda(UUID professionalId, Instant from, Instant to) {
        return appointments.agenda(professionalId, from, to).stream().map(this::view).toList();
    }

    // ---------- sinal (cliente envia, profissional confere) ----------

    @Transactional
    AppointmentView attachReceipt(UUID clientAccountId, UUID id, String receiptKey) {
        Appointment a = ownedByClient(clientAccountId, id);
        require(a, AppointmentStatus.AWAITING_DEPOSIT, AppointmentStatus.RECEIPT_SENT);
        String key = media.normalizeKey(receiptKey);
        media.assertOwned(key, clientAccountId, MediaKind.RECEIPT);
        a.receiptKey = key;
        return transition(a, AppointmentStatus.RECEIPT_SENT);
    }

    @Transactional
    AppointmentView confirmDeposit(UUID professionalId, UUID id) {
        Appointment a = ownedByPro(professionalId, id);
        require(a, AppointmentStatus.RECEIPT_SENT);
        return transition(a, AppointmentStatus.CONFIRMED);
    }

    /** Comprovante recusado: volta a aguardar o sinal, com pelo menos 2h a mais para reenviar. */
    @Transactional
    AppointmentView rejectReceipt(UUID professionalId, UUID id) {
        Appointment a = ownedByPro(professionalId, id);
        require(a, AppointmentStatus.RECEIPT_SENT);
        a.receiptKey = null;
        Instant extended = clock.instant().plus(Duration.ofHours(2));
        if (a.depositDueAt == null || a.depositDueAt.isBefore(extended)) a.depositDueAt = extended.isBefore(a.startsAt) ? extended : a.startsAt;
        return transition(a, AppointmentStatus.AWAITING_DEPOSIT);
    }

    // ---------- ajuste de valor ----------

    @Transactional
    AppointmentView proposeAdjustment(UUID professionalId, UUID id, AdjustmentInput in) {
        Appointment a = ownedByPro(professionalId, id);
        require(a, AppointmentStatus.AWAITING_DEPOSIT, AppointmentStatus.RECEIPT_SENT, AppointmentStatus.CONFIRMED);
        a.previousStatus = a.status;
        a.adjNewPriceCents = in.newPriceCents();
        a.adjNote = StringUtils.hasText(in.note()) ? in.note().trim() : null;
        a.adjStatus = "PENDING";
        return transition(a, AppointmentStatus.ADJUSTMENT_PENDING);
    }

    @Transactional
    AppointmentView respondAdjustment(UUID clientAccountId, UUID id, boolean accept) {
        Appointment a = ownedByClient(clientAccountId, id);
        require(a, AppointmentStatus.ADJUSTMENT_PENDING);
        if (accept) a.priceCents = a.adjNewPriceCents;
        a.adjStatus = accept ? "ACCEPTED" : "DECLINED";
        AppointmentStatus back = a.previousStatus != null ? a.previousStatus : AppointmentStatus.AWAITING_DEPOSIT;
        a.previousStatus = null;
        return transition(a, back);
    }

    // ---------- conclusão / cancelamento ----------

    @Transactional
    AppointmentView complete(UUID professionalId, UUID id) {
        Appointment a = ownedByPro(professionalId, id);
        require(a, AppointmentStatus.CONFIRMED);
        AppointmentView v = transition(a, AppointmentStatus.COMPLETED);
        events.publishEvent(new AppointmentCompleted(a.id, a.professionalId, a.clientAccountId, a.serviceId, a.priceCents - a.discountCents));
        return v;
    }

    @Transactional
    AppointmentView cancel(UUID accountId, UUID id) {
        Appointment a = load(id);
        boolean client = a.clientAccountId.equals(accountId);
        if (!client && !isProOf(accountId, a)) throw notFound();
        if (!a.status.active()) throw invalidState(a);
        a.cancelledBy = client ? "CLIENT" : "PROFESSIONAL";
        if (a.discountCents > 0) loyalty.release(a.id);
        return transition(a, AppointmentStatus.CANCELLED);
    }

    /** Roda a cada minuto: expira sinais vencidos e libera o horário. */
    @Scheduled(fixedDelayString = "${app.scheduling.expiry-interval:60000}", initialDelay = 10_000)
    @Transactional
    public int expireOverdueDeposits() {
        var overdue = appointments.findByStatusAndDepositDueAtBefore(AppointmentStatus.AWAITING_DEPOSIT, clock.instant());
        for (Appointment a : overdue) {
            if (a.discountCents > 0) loyalty.release(a.id);
            transition(a, AppointmentStatus.EXPIRED);
        }
        return overdue.size();
    }

    // ---------- apoio ----------

    private AppointmentView transition(Appointment a, AppointmentStatus to) {
        a.status = to;
        a.updatedAt = clock.instant();
        return view(a);
    }

    private static void require(Appointment a, AppointmentStatus... allowed) {
        for (AppointmentStatus s : allowed) if (a.status == s) return;
        throw invalidState(a);
    }

    private static ApiException invalidState(Appointment a) {
        return ApiException.conflict("INVALID_STATE", "Ação indisponível: o agendamento está %s.".formatted(label(a.status)));
    }

    static String label(AppointmentStatus s) {
        return switch (s) {
            case AWAITING_DEPOSIT -> "aguardando o sinal";
            case RECEIPT_SENT -> "com comprovante em análise";
            case CONFIRMED -> "confirmado";
            case ADJUSTMENT_PENDING -> "com novo valor pendente";
            case COMPLETED -> "concluído";
            case CANCELLED -> "cancelado";
            case EXPIRED -> "expirado";
        };
    }

    private Appointment load(UUID id) {
        return appointments.findById(id).orElseThrow(AppointmentService::notFound);
    }

    private Appointment ownedByClient(UUID clientAccountId, UUID id) {
        Appointment a = load(id);
        if (!a.clientAccountId.equals(clientAccountId)) throw notFound();
        return a;
    }

    private Appointment ownedByPro(UUID professionalId, UUID id) {
        Appointment a = load(id);
        if (!a.professionalId.equals(professionalId)) throw notFound();
        return a;
    }

    private boolean isProOf(UUID accountId, Appointment a) {
        try {
            return profiles.requireProfessionalId(accountId).equals(a.professionalId);
        } catch (ApiException e) {
            return false;
        }
    }

    private static ApiException notFound() {
        return ApiException.notFound("APPOINTMENT_NOT_FOUND", "Agendamento não encontrado.");
    }

    AppointmentView view(Appointment a) {
        var c = profiles.clientSummary(a.clientAccountId).orElse(null);
        var p = profiles.publicProfessional(a.professionalId).orElse(null);
        int duration = (int) Duration.between(a.startsAt, a.endsAt).toMinutes();
        int returnDays = catalog.activeService(a.serviceId).map(ServiceView::returnIntervalDays).orElse(0);
        return new AppointmentView(
                a.id, a.status.name(),
                c == null ? null : new PartyClient(c.accountId(), c.name(), c.photoUrl(), c.phone()),
                p == null ? null : new PartyProfessional(p.id(), p.studio(), p.photoUrl(), p.neighborhood(), p.city(), p.pixKey()),
                a.serviceId, a.serviceName, duration, returnDays, a.designId, a.designName, a.startsAt, a.endsAt,
                a.selections.stream().map(s -> new SelectionView(s.optionId, s.choiceId, s.optionLabel, s.choiceLabel, s.priceDeltaCents)).toList(),
                a.priceCents, a.discountCents, a.priceCents - a.discountCents, a.depositCents, a.depositDueAt,
                media.signedReadUrl(a.receiptKey), media.signedReadUrl(a.referenceKey), a.notes,
                a.adjStatus == null ? null : new AdjustmentView(a.adjNewPriceCents, a.adjNote, a.adjStatus),
                a.cancelledBy, a.createdAt);
    }
}
