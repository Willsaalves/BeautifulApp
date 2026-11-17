package com.beautifulapp.scheduling.adapter.out.modules;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.beautifulapp.catalog.CatalogApi;
import com.beautifulapp.catalog.CatalogViews.ServiceView;
import com.beautifulapp.scheduling.application.port.out.ServiceCatalog;
import com.beautifulapp.scheduling.domain.DesignOffer;
import com.beautifulapp.scheduling.domain.ServiceOffer;

/** Porta ServiceCatalog sobre o módulo catalog: traduz para o vocabulário do agendamento. */
@Component
class CatalogAdapter implements ServiceCatalog {
    private final CatalogApi catalog;

    CatalogAdapter(CatalogApi catalog) { this.catalog = catalog; }

    @Override
    public Optional<ServiceOffer> activeService(UUID serviceId) { return catalog.activeService(serviceId).map(CatalogAdapter::offer); }

    @Override
    public Optional<DesignOffer> design(UUID designId) {
        return catalog.design(designId).map(d -> new DesignOffer(d.id(), d.serviceId(), d.name(), d.priceDeltaCents()));
    }

    private static ServiceOffer offer(ServiceView s) {
        return new ServiceOffer(s.id(), s.professionalId(), s.name(), s.durationMin(), s.priceCents(), s.depositPercent(),
                s.requiresReference(), s.returnIntervalDays(),
                s.options().stream().map(o -> new ServiceOffer.Option(o.id(), o.label(),
                        o.choices().stream().map(c -> new ServiceOffer.Choice(c.id(), c.label(), c.priceDeltaCents())).toList())).toList());
    }
}
