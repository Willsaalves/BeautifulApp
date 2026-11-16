package com.beautifulapp.scheduling.adapter.in.web;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import com.beautifulapp.scheduling.application.port.in.AppointmentDetails;
import com.beautifulapp.scheduling.domain.Availability;
import com.beautifulapp.scheduling.domain.TimeBlock;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

/** Formato HTTP (contrato com o app). Os nomes ficam iguais para o openapi.json não mudar. */
final class SchedulingDtos {
    private SchedulingDtos() {}

    record WorkDayInput(@Min(0) @Max(6) int weekday, @NotNull LocalTime start, @NotNull LocalTime end) {}

    record BlockInput(@NotNull Instant startsAt, @NotNull Instant endsAt, @Size(max = 80) String reason) {}

    record BlockView(UUID id, Instant startsAt, Instant endsAt, String reason) {
        static BlockView of(TimeBlock b) { return new BlockView(b.id(), b.startsAt(), b.endsAt(), b.reason()); }
    }

    record Slot(Instant start, Instant end, Availability.SlotStatus status) {
        static Slot of(Availability.Slot s) { return new Slot(s.start(), s.end(), s.status()); }
    }

    record SelectionInput(@NotNull UUID optionId, @NotNull UUID choiceId) {}

    record CreateAppointment(
            @NotNull UUID serviceId,
            @NotNull Instant startsAt,
            @Size(max = 6) List<@Valid SelectionInput> selections,
            UUID designId,
            String referenceKey,
            @Size(max = 500) String notes,
            UUID voucherId) {}

    record ReceiptInput(@NotBlank String receiptKey) {}

    record AdjustmentInput(@PositiveOrZero long newPriceCents, @Size(max = 200) String note) {}

    record SelectionView(UUID optionId, UUID choiceId, String optionLabel, String choiceLabel, long priceDeltaCents) {}

    record PartyClient(UUID accountId, String name, String photoUrl, String phone) {}

    record PartyProfessional(UUID id, String studio, String photoUrl, String neighborhood, String city, String pixKey) {}

    record AdjustmentView(long newPriceCents, String note, String status) {}

    record AppointmentView(
            UUID id, String status,
            PartyClient client, PartyProfessional professional,
            UUID serviceId, String serviceName, int durationMin, int returnIntervalDays,
            UUID designId, String designName,
            Instant startsAt, Instant endsAt,
            List<SelectionView> selections,
            long priceCents, long discountCents, long totalCents, long depositCents, Instant depositDueAt,
            String receiptUrl, String referenceUrl, String notes,
            AdjustmentView adjustment, String cancelledBy, Instant createdAt) {

        static AppointmentView of(AppointmentDetails d) {
            var s = d.state();
            var c = d.client();
            var p = d.professional();
            return new AppointmentView(s.id(), s.status().name(),
                    c == null ? null : new PartyClient(c.accountId(), c.name(), c.photoUrl(), c.phone()),
                    p == null ? null : new PartyProfessional(p.id(), p.studio(), p.photoUrl(), p.neighborhood(), p.city(), p.pixKey()),
                    s.serviceId(), s.serviceName(), d.durationMin(), d.returnIntervalDays(), s.designId(), s.designName(),
                    s.startsAt(), s.endsAt(),
                    s.selections().stream().map(x -> new SelectionView(x.optionId(), x.choiceId(), x.optionLabel(), x.choiceLabel(), x.priceDeltaCents())).toList(),
                    s.priceCents(), s.discountCents(), d.totalCents(), s.depositCents(), s.depositDueAt(),
                    d.receiptUrl(), d.referenceUrl(), s.notes(),
                    s.adjStatus() == null ? null : new AdjustmentView(s.adjNewPriceCents(), s.adjNote(), s.adjStatus()),
                    s.cancelledBy(), s.createdAt());
        }
    }
}
