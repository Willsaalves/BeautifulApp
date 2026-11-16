package com.beautifulapp.profile.internal;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "client_profile")
class ClientProfile {
    @Id
    @Column(name = "account_id")
    UUID accountId;
    @Column(nullable = false)
    String name;
    @Column(nullable = false, unique = true)
    String handle;
    String bio;
    @Column(name = "photo_key")
    String photoKey;
    @Column(name = "cover_key")
    String coverKey;
    @Column(name = "created_at", nullable = false)
    Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    protected ClientProfile() {}

    ClientProfile(UUID accountId, String name, String handle, Instant now) {
        this.accountId = accountId;
        this.name = name;
        this.handle = handle;
        this.createdAt = now;
        this.updatedAt = now;
    }
}
