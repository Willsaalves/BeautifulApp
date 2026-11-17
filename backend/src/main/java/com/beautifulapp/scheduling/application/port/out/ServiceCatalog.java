package com.beautifulapp.scheduling.application.port.out;

import java.util.Optional;
import java.util.UUID;

import com.beautifulapp.scheduling.domain.DesignOffer;
import com.beautifulapp.scheduling.domain.ServiceOffer;

/** Serviços e designs ativos (implementado sobre o módulo catalog). */
public interface ServiceCatalog {
    Optional<ServiceOffer> activeService(UUID serviceId);

    Optional<DesignOffer> design(UUID designId);
}
