package com.beautifulapp.scheduling.domain;

import java.util.UUID;

/** Trending Design escolhido pela cliente (acrescenta valor ao serviço). */
public record DesignOffer(UUID id, UUID serviceId, String name, long priceDeltaCents) {}
