package com.beautifulapp.identity.internal;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "otp_challenge")
class OtpChallenge {
    @Id
    private UUID id;
    @Column(nullable = false)
    private String phone;
    @Column(name = "code_hash", nullable = false)
    private String codeHash;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(nullable = false)
    private int attempts;
    @Column(name = "consumed_at")
    private Instant consumedAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected OtpChallenge() {}

    OtpChallenge(UUID id, String phone, String codeHash, Instant createdAt, Instant expiresAt) {
        this.id = id;
        this.phone = phone;
        this.codeHash = codeHash;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    String codeHash() { return codeHash; }
    int attempts() { return attempts; }
    Instant expiresAt() { return expiresAt; }
    void failedAttempt() { attempts++; }
    void consume(Instant now) { consumedAt = now; }
}
