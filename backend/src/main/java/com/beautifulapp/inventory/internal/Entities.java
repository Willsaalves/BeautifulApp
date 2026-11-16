package com.beautifulapp.inventory.internal;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.*;

enum Unit { UN, ML, G }

enum Reason { PURCHASE, ATTENDANCE, ADJUSTMENT }

@Entity
@Table(name = "product")
class Product {
    @Id UUID id;
    @Column(name = "professional_id", nullable = false) UUID professionalId;
    @Column(nullable = false) String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false) Unit unit;
    @Column(nullable = false) BigDecimal quantity = BigDecimal.ZERO;
    @Column(name = "min_quantity", nullable = false) BigDecimal minQuantity = BigDecimal.ZERO;
    @Column(name = "avg_cost_cents") BigDecimal avgCostCents;
    String lot;
    @Column(name = "expires_at") LocalDate expiresAt;
    @Column(nullable = false) boolean active = true;
    @Column(name = "created_at", nullable = false) Instant createdAt;

    protected Product() {}

    Product(UUID id, UUID professionalId, Instant now) {
        this.id = id;
        this.professionalId = professionalId;
        this.createdAt = now;
    }
}

@Entity
@Table(name = "stock_movement")
class StockMovement {
    @Id UUID id;
    @Column(name = "product_id", nullable = false) UUID productId;
    @Column(nullable = false) BigDecimal delta;
    @Enumerated(EnumType.STRING) @Column(nullable = false) Reason reason;
    @Column(name = "unit_cost_cents") BigDecimal unitCostCents;
    @Column(name = "appointment_id") UUID appointmentId;
    String note;
    @Column(name = "created_at", nullable = false) Instant createdAt;

    protected StockMovement() {}

    StockMovement(UUID id, UUID productId, BigDecimal delta, Reason reason, BigDecimal unitCostCents, UUID appointmentId, String note, Instant createdAt) {
        this.id = id;
        this.productId = productId;
        this.delta = delta;
        this.reason = reason;
        this.unitCostCents = unitCostCents;
        this.appointmentId = appointmentId;
        this.note = note;
        this.createdAt = createdAt;
    }
}

@Entity
@Table(name = "service_consumption")
@IdClass(ServiceConsumption.Key.class)
class ServiceConsumption {
    @Id @Column(name = "service_id") UUID serviceId;
    @Id @Column(name = "product_id") UUID productId;
    @Column(nullable = false) BigDecimal amount;

    protected ServiceConsumption() {}

    ServiceConsumption(UUID serviceId, UUID productId, BigDecimal amount) {
        this.serviceId = serviceId;
        this.productId = productId;
        this.amount = amount;
    }

    record Key(UUID serviceId, UUID productId) implements Serializable {
        Key() { this(null, null); }
    }
}
