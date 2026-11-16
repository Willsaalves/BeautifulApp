package com.beautifulapp.catalog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.beautifulapp.catalog.CatalogViews.DesignView;
import com.beautifulapp.catalog.CatalogViews.ServiceView;

public interface CatalogApi {
    List<ServiceView> activeServices(UUID professionalId);

    Optional<ServiceView> activeService(UUID serviceId);

    Optional<DesignView> design(UUID designId);

    /** Designs cujos serviços estão ativos. */
    List<DesignView> designs(UUID professionalId);
}
