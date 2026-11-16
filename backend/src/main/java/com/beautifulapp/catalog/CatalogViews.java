package com.beautifulapp.catalog;

import java.util.List;
import java.util.UUID;

import com.beautifulapp.profile.Niche;

/** Visões públicas do catálogo (usadas pela página pública e pelo agendamento). */
public final class CatalogViews {
    private CatalogViews() {}

    public record ChoiceView(UUID id, String label, long priceDeltaCents) {}

    public record OptionView(UUID id, String label, List<ChoiceView> choices) {}

    public record ServiceView(UUID id, UUID professionalId, String name, Niche niche, int durationMin, long priceCents,
                              int depositPercent, int returnIntervalDays, boolean requiresReference, List<OptionView> options) {}

    public record DesignView(UUID id, UUID professionalId, UUID serviceId, String name, String imageKey, String imageUrl, long priceDeltaCents) {}
}
