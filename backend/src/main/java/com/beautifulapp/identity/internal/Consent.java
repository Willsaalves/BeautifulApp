package com.beautifulapp.identity.internal;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "consent")
class Consent {
    @Id
    private UUID id;
    @Column(name = "account_id", nullable = false)
    private UUID accountId;
    @Column(nullable = false)
    private String kind;
    @Column(nullable = false)
    private String version;
    @Column(name = "accepted_at", nullable = false)
    private Instant acceptedAt;
    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected Consent() {}

    String version() { return version; }
    boolean active() { return revokedAt == null; }
    void revoke(Instant now) { if (revokedAt == null) revokedAt = now; }

    Consent(UUID id, UUID accountId, String kind, String version, Instant acceptedAt) {
        this.id = id;
        this.accountId = accountId;
        this.kind = kind;
        this.version = version;
        this.acceptedAt = acceptedAt;
    }
}
