package com.beautifulapp.catalog.internal;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "design")
class Design {
    @Id UUID id;
    @Column(name = "professional_id", nullable = false) UUID professionalId;
    @Column(name = "service_id", nullable = false) UUID serviceId;
    @Column(nullable = false) String name;
    @Column(name = "image_key", nullable = false) String imageKey;
    @Column(name = "price_delta_cents", nullable = false) long priceDeltaCents;
    @Column(nullable = false) int position;
    @Column(name = "created_at", nullable = false) Instant createdAt;

    protected Design() {}

    Design(UUID id, UUID professionalId, Instant createdAt) {
        this.id = id;
        this.professionalId = professionalId;
        this.createdAt = createdAt;
    }
}
