package com.beautifulapp.catalog.internal;

import java.time.Clock;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.catalog.CatalogApi;
import com.beautifulapp.catalog.CatalogViews.*;
import com.beautifulapp.catalog.internal.CatalogDtos.*;
import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.Ids;
import com.beautifulapp.media.MediaApi;
import com.beautifulapp.media.MediaKind;

@Service
class CatalogService implements CatalogApi {
    private final ServiceRepository services;
    private final DesignRepository designs;
    private final MediaApi media;
    private final Clock clock;

    CatalogService(ServiceRepository services, DesignRepository designs, MediaApi media, Clock clock) {
        this.services = services;
        this.designs = designs;
        this.media = media;
        this.clock = clock;
    }

    // ---------- leitura (API pública do módulo) ----------

    @Override
    @Transactional(readOnly = true)
    public List<ServiceView> activeServices(UUID professionalId) {
        return services.findByProfessionalIdAndActiveTrueOrderByPositionAscCreatedAtAsc(professionalId).stream().map(this::view).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ServiceView> activeService(UUID serviceId) {
        return services.findByIdAndActiveTrue(serviceId).map(this::view);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DesignView> designs(UUID professionalId) {
        return designs.findVisibleByProfessional(professionalId).stream().map(this::view).toList();
    }

    // ---------- serviços da profissional logada ----------

    @Transactional
    ServiceView create(UUID professionalId, ServiceInput in) {
        BeautyService s = new BeautyService(Ids.newId(), professionalId, clock.instant());
        s.position = services.maxPosition(professionalId) + 1;
        apply(s, in);
        return view(services.save(s));
    }

    @Transactional
    ServiceView update(UUID professionalId, UUID id, ServiceInput in) {
        BeautyService s = own(professionalId, id);
        apply(s, in);
        s.updatedAt = clock.instant();
        return view(s);
    }

    /** Desativa (não apaga): agendamentos antigos continuam apontando para o serviço. */
    @Transactional
    void deactivate(UUID professionalId, UUID id) {
        own(professionalId, id).active = false;
    }

    private void apply(BeautyService s, ServiceInput in) {
        s.name = in.name().trim();
        s.niche = in.niche();
        s.durationMin = in.durationMin();
        s.priceCents = in.priceCents();
        s.depositPercent = in.depositPercent();
        s.returnIntervalDays = in.returnIntervalDays();
        s.requiresReference = Boolean.TRUE.equals(in.requiresReference());

        // atualiza no lugar, mantendo ids já existentes
        Map<UUID, ServiceOption> current = s.options.stream().collect(Collectors.toMap(o -> o.id, Function.identity()));
        List<ServiceOption> next = new ArrayList<>();
        List<OptionInput> inputs = in.options() == null ? List.of() : in.options();
        for (int i = 0; i < inputs.size(); i++) {
            OptionInput oi = inputs.get(i);
            ServiceOption o = oi.id() != null && current.containsKey(oi.id()) ? current.get(oi.id()) : new ServiceOption(Ids.newId(), s);
            o.label = oi.label().trim();
            o.position = i;
            Map<UUID, ServiceChoice> currentChoices = new HashMap<>();
            o.choices.forEach(c -> currentChoices.put(c.id, c));
            List<ServiceChoice> nextChoices = new ArrayList<>();
            for (int j = 0; j < oi.choices().size(); j++) {
                ChoiceInput ci = oi.choices().get(j);
                ServiceChoice c = ci.id() != null && currentChoices.containsKey(ci.id()) ? currentChoices.get(ci.id()) : new ServiceChoice(Ids.newId(), o);
                c.label = ci.label().trim();
                c.priceDeltaCents = ci.priceDeltaCents();
                c.position = j;
                nextChoices.add(c);
            }
            o.choices.retainAll(nextChoices);
            nextChoices.stream().filter(c -> !o.choices.contains(c)).forEach(o.choices::add);
            next.add(o);
        }
        s.options.retainAll(next);
        next.stream().filter(o -> !s.options.contains(o)).forEach(s.options::add);
    }

    // ---------- designs ----------

    @Transactional
    DesignView createDesign(UUID professionalId, UUID accountId, DesignInput in) {
        Design d = new Design(Ids.newId(), professionalId, clock.instant());
        applyDesign(d, professionalId, accountId, in);
        return view(designs.save(d));
    }

    @Transactional
    DesignView updateDesign(UUID professionalId, UUID accountId, UUID id, DesignInput in) {
        Design d = designs.findById(id).filter(x -> x.professionalId.equals(professionalId))
                .orElseThrow(() -> ApiException.notFound("DESIGN_NOT_FOUND", "Design não encontrado."));
        applyDesign(d, professionalId, accountId, in);
        return view(d);
    }

    @Transactional
    void deleteDesign(UUID professionalId, UUID id) {
        designs.findById(id).filter(x -> x.professionalId.equals(professionalId)).ifPresent(designs::delete);
    }

    @Transactional(readOnly = true)
    List<DesignView> myDesigns(UUID professionalId) {
        return designs.findVisibleByProfessional(professionalId).stream().map(this::view).toList();
    }

    private void applyDesign(Design d, UUID professionalId, UUID accountId, DesignInput in) {
        own(professionalId, in.serviceId());
        String key = media.normalizeKey(in.imageKey());
        media.assertOwned(key, accountId, MediaKind.DESIGN);
        d.serviceId = in.serviceId();
        d.name = in.name().trim().toUpperCase();
        d.imageKey = key;
        d.priceDeltaCents = in.priceDeltaCents();
    }

    private BeautyService own(UUID professionalId, UUID serviceId) {
        return services.findById(serviceId).filter(s -> s.professionalId.equals(professionalId) && s.active)
                .orElseThrow(() -> ApiException.notFound("SERVICE_NOT_FOUND", "Serviço não encontrado."));
    }

    private ServiceView view(BeautyService s) {
        return new ServiceView(s.id, s.professionalId, s.name, s.niche, s.durationMin, s.priceCents, s.depositPercent,
                s.returnIntervalDays, s.requiresReference,
                s.options.stream().map(o -> new OptionView(o.id, o.label,
                        o.choices.stream().map(c -> new ChoiceView(c.id, c.label, c.priceDeltaCents)).toList())).toList());
    }

    private DesignView view(Design d) {
        return new DesignView(d.id, d.professionalId, d.serviceId, d.name, d.imageKey, media.publicUrl(d.imageKey), d.priceDeltaCents);
    }
}
