package com.beautifulapp.scheduling.domain;

import java.util.List;
import java.util.UUID;

/** O serviço como o agendamento precisa enxergá-lo (vem do catálogo por uma porta de saída). */
public record ServiceOffer(UUID id, UUID professionalId, String name, int durationMin, long priceCents, int depositPercent,
                           boolean requiresReference, int returnIntervalDays, List<Option> options) {
    public record Option(UUID id, String label, List<Choice> choices) {}
    public record Choice(UUID id, String label, long priceDeltaCents) {}
}
