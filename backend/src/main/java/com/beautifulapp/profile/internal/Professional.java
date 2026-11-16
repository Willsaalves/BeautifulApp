package com.beautifulapp.profile.internal;

import java.time.Instant;
import java.util.UUID;

import com.beautifulapp.profile.Niche;

import jakarta.persistence.*;

@Entity
@Table(name = "professional")
class Professional {
    @Id
    UUID id;
    @Column(name = "account_id", nullable = false, unique = true)
    UUID accountId;
    @Column(nullable = false)
    String name;
    @Column(nullable = false)
    String studio;
    @Column(nullable = false, unique = true)
    String handle;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    Niche niche;
    String bio;
    @Column(name = "photo_key")
    String photoKey;
    @Column(name = "cover_key")
    String coverKey;
    @Column(nullable = false)
    String neighborhood;
    @Column(nullable = false)
    String city;
    @Column(name = "pix_key")
    String pixKey;
    @Column(name = "deposit_deadline_hours", nullable = false)
    int depositDeadlineHours = 12;
    @Column(name = "created_at", nullable = false)
    Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    protected Professional() {}

    Professional(UUID id, UUID accountId, String name, String studio, String handle, Niche niche,
                 String neighborhood, String city, Instant now) {
        this.id = id;
        this.accountId = accountId;
        this.name = name;
        this.studio = studio;
        this.handle = handle;
        this.niche = niche;
        this.neighborhood = neighborhood;
        this.city = city;
        this.createdAt = now;
        this.updatedAt = now;
    }
}
