package com.beautifulapp.scheduling.internal;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

final class SchedulingDtos {
    private SchedulingDtos() {}

    record WorkDayInput(@Min(0) @Max(6) int weekday, @NotNull LocalTime start, @NotNull LocalTime end) {}

    record BlockInput(@NotNull Instant startsAt, @NotNull Instant endsAt, @Size(max = 80) String reason) {}

    record BlockView(UUID id, Instant startsAt, Instant endsAt, String reason) {}

    enum SlotStatus { FREE, BUSY, PAST }

    record Slot(Instant start, Instant end, SlotStatus status) {}

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
            AdjustmentView adjustment, String cancelledBy, Instant createdAt) {}
}
