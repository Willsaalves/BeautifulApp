package com.beautifulapp.catalog.internal;

import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "service_choice")
class ServiceChoice {
    @Id UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "option_id", nullable = false) ServiceOption option;
    @Column(nullable = false) String label;
    @Column(name = "price_delta_cents", nullable = false) long priceDeltaCents;
    @Column(nullable = false) int position;

    protected ServiceChoice() {}

    ServiceChoice(UUID id, ServiceOption option) {
        this.id = id;
        this.option = option;
    }
}
