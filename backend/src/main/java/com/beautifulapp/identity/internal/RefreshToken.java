package com.beautifulapp.identity.internal;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "refresh_token")
class RefreshToken {
    @Id
    private UUID id;
    @Column(name = "account_id", nullable = false)
    private UUID accountId;
    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;
    /** Todos os tokens de uma mesma sessão compartilham a família: reuso de token revogado derruba a família inteira. */
    @Column(name = "family_id", nullable = false)
    private UUID familyId;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "revoked_at")
    private Instant revokedAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected RefreshToken() {}

    RefreshToken(UUID id, UUID accountId, String tokenHash, UUID familyId, Instant createdAt, Instant expiresAt) {
        this.id = id;
        this.accountId = accountId;
        this.tokenHash = tokenHash;
        this.familyId = familyId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    UUID accountId() { return accountId; }
    UUID familyId() { return familyId; }
    Instant expiresAt() { return expiresAt; }
    boolean revoked() { return revokedAt != null; }
    void revoke(Instant now) { if (revokedAt == null) revokedAt = now; }
}
