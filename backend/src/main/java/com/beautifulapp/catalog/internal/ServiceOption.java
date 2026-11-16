package com.beautifulapp.catalog.internal;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "service_option")
class ServiceOption {
    @Id UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "service_id", nullable = false) BeautyService service;
    @Column(nullable = false) String label;
    @Column(nullable = false) int position;

    @OneToMany(mappedBy = "option", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    List<ServiceChoice> choices = new ArrayList<>();

    protected ServiceOption() {}

    ServiceOption(UUID id, BeautyService service) {
        this.id = id;
        this.service = service;
    }
}
