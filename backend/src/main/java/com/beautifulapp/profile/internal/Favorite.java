package com.beautifulapp.profile.internal;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "favorite")
@IdClass(Favorite.Key.class)
class Favorite {
    @Id
    @Column(name = "client_account_id")
    UUID clientAccountId;
    @Id
    @Column(name = "professional_id")
    UUID professionalId;
    @Column(name = "created_at", nullable = false)
    Instant createdAt;

    protected Favorite() {}

    Favorite(UUID clientAccountId, UUID professionalId, Instant createdAt) {
        this.clientAccountId = clientAccountId;
        this.professionalId = professionalId;
        this.createdAt = createdAt;
    }

    UUID professionalId() { return professionalId; }

    record Key(UUID clientAccountId, UUID professionalId) implements Serializable {
        Key() { this(null, null); }
    }
}
