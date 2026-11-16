package com.beautifulapp.scheduling.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Orçamento calculado no servidor: preço base + escolhas + design. Valida que as escolhas e o design
 * pertencem ao serviço e que há referência quando o serviço exige.
 */
public record Quote(ServiceOffer service, List<Selection> selections, DesignOffer design, String referenceKey, long priceCents) {

    public static Quote of(ServiceOffer svc, Map<UUID, UUID> chosen, DesignOffer design, String referenceKey) {
        long price = svc.priceCents();
        List<Selection> selections = new ArrayList<>();
        for (ServiceOffer.Option opt : svc.options()) {
            UUID choiceId = chosen.getOrDefault(opt.id(), opt.choices().get(0).id());
            ServiceOffer.Choice choice = opt.choices().stream().filter(c -> c.id().equals(choiceId)).findFirst()
                    .orElseThrow(() -> SchedulingException.invalid("CHOICE_INVALID", "Opção inválida para \"%s\".".formatted(opt.label())));
            selections.add(new Selection(opt.id(), choice.id(), opt.label(), choice.label(), choice.priceDeltaCents()));
            price += choice.priceDeltaCents();
        }
        if (design != null) {
            if (!design.serviceId().equals(svc.id())) throw SchedulingException.invalid("DESIGN_INVALID", "Esse design não é deste serviço.");
            price += design.priceDeltaCents();
        }
        if (svc.requiresReference() && referenceKey == null && design == null) {
            throw SchedulingException.invalid("REFERENCE_REQUIRED", "Escolha um Trending Design ou anexe sua foto de referência.");
        }
        return new Quote(svc, List.copyOf(selections), design, referenceKey, price);
    }
}
