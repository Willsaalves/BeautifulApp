package com.beautifulapp.inventory.internal;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.*;

final class InventoryDtos {
    private InventoryDtos() {}

    record ProductView(UUID id, String name, Unit unit, double quantity, double minQuantity, Double avgCostCents,
                       String lot, LocalDate expiresAt, boolean low) {}

    record ProductInput(@NotBlank @Size(max = 80) String name, @NotNull Unit unit, @PositiveOrZero double minQuantity,
                        @Size(max = 40) String lot, LocalDate expiresAt) {}

    record PurchaseInput(@Positive double quantity, @PositiveOrZero Double unitCostCents, @Size(max = 40) String lot, LocalDate expiresAt) {}

    record AdjustInput(double delta, @Size(max = 120) String note) {}

    record MovementView(UUID id, UUID productId, String productName, double delta, Reason reason, Double unitCostCents,
                        UUID appointmentId, String note, Instant createdAt) {}

    record ConsumptionView(UUID serviceId, UUID productId, double amount) {}

    record ConsumptionInput(@NotNull UUID productId, @Positive double amount) {}
}
