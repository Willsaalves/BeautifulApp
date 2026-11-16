package com.beautifulapp.loyalty.internal;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "loyalty_program")
class LoyaltyProgram {
    @Id @Column(name = "professional_id") UUID professionalId;
    @Column(nullable = false) boolean enabled;
    @Column(name = "goal_cents", nullable = false) long goalCents;
    @Column(name = "discount_percent", nullable = false) int discountPercent;

    protected LoyaltyProgram() {}

    LoyaltyProgram(UUID professionalId, boolean enabled, long goalCents, int discountPercent) {
        this.professionalId = professionalId;
        this.enabled = enabled;
        this.goalCents = goalCents;
        this.discountPercent = discountPercent;
    }
}

@Entity
@Table(name = "loyalty_balance")
@IdClass(LoyaltyBalance.Key.class)
class LoyaltyBalance {
    @Id @Column(name = "client_account_id") UUID clientAccountId;
    @Id @Column(name = "professional_id") UUID professionalId;
    @Column(name = "spent_cents", nullable = false) long spentCents;
    @Column(name = "cycles_rewarded", nullable = false) int cyclesRewarded;

    protected LoyaltyBalance() {}

    LoyaltyBalance(UUID clientAccountId, UUID professionalId) {
        this.clientAccountId = clientAccountId;
        this.professionalId = professionalId;
    }

    record Key(UUID clientAccountId, UUID professionalId) implements Serializable {
        Key() { this(null, null); }
    }
}

@Entity
@Table(name = "voucher")
class Voucher {
    @Id UUID id;
    @Column(name = "client_account_id", nullable = false) UUID clientAccountId;
    @Column(name = "professional_id") UUID professionalId;
    @Column(nullable = false) String kind;
    @Column(nullable = false) int percent;
    @Column(nullable = false) String label;
    Integer cycle;
    @Column(name = "year_month") String yearMonth;
    @Column(name = "used_appointment_id") UUID usedAppointmentId;
    @Column(name = "used_at") Instant usedAt;
    @Column(name = "created_at", nullable = false) Instant createdAt;

    protected Voucher() {}

    Voucher(UUID id, UUID clientAccountId, UUID professionalId, String kind, int percent, String label, Instant createdAt) {
        this.id = id;
        this.clientAccountId = clientAccountId;
        this.professionalId = professionalId;
        this.kind = kind;
        this.percent = percent;
        this.label = label;
        this.createdAt = createdAt;
    }
}
