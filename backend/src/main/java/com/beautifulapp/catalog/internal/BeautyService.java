package com.beautifulapp.catalog.internal;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.beautifulapp.profile.Niche;

import jakarta.persistence.*;

/** Tabela "service" (o nome evita conflito com a anotação @Service do Spring). */
@Entity
@Table(name = "service")
class BeautyService {
    @Id UUID id;
    @Column(name = "professional_id", nullable = false) UUID professionalId;
    @Column(nullable = false) String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false) Niche niche;
    @Column(name = "duration_min", nullable = false) int durationMin;
    @Column(name = "price_cents", nullable = false) long priceCents;
    @Column(name = "deposit_percent", nullable = false) int depositPercent;
    @Column(name = "return_interval_days", nullable = false) int returnIntervalDays;
    @Column(name = "requires_reference", nullable = false) boolean requiresReference;
    @Column(nullable = false) boolean active = true;
    @Column(nullable = false) int position;
    @Column(name = "created_at", nullable = false) Instant createdAt;
    @Column(name = "updated_at", nullable = false) Instant updatedAt;

    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    List<ServiceOption> options = new ArrayList<>();

    protected BeautyService() {}

    BeautyService(UUID id, UUID professionalId, Instant now) {
        this.id = id;
        this.professionalId = professionalId;
        this.createdAt = now;
        this.updatedAt = now;
    }
}
