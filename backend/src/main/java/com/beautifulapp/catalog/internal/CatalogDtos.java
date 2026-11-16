package com.beautifulapp.catalog.internal;

import java.util.List;
import java.util.UUID;

import com.beautifulapp.profile.Niche;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

final class CatalogDtos {
    private CatalogDtos() {}

    /** id opcional: mantém o mesmo id ao editar (agendamentos guardam a escolha por id). */
    record ChoiceInput(UUID id, @NotBlank @Size(max = 40) String label, @PositiveOrZero long priceDeltaCents) {}

    record OptionInput(UUID id, @NotBlank @Size(max = 40) String label,
                       @NotNull @Size(min = 1, max = 12) List<@Valid ChoiceInput> choices) {}

    record ServiceInput(
            @NotBlank @Size(min = 2, max = 80) String name,
            @NotNull Niche niche,
            @Min(5) @Max(600) int durationMin,
            @PositiveOrZero long priceCents,
            @Min(0) @Max(100) int depositPercent,
            @Min(0) @Max(730) int returnIntervalDays,
            Boolean requiresReference,
            @Size(max = 6) List<@Valid OptionInput> options) {}

    record DesignInput(@NotNull UUID serviceId, @NotBlank @Size(max = 40) String name,
                       @NotBlank String imageKey, @PositiveOrZero long priceDeltaCents) {}
}
