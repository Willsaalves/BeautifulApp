package com.beautifulapp.identity.internal;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

import com.beautifulapp.identity.AccountView;
import com.beautifulapp.identity.Role;

import jakarta.persistence.*;

@Entity
@Table(name = "account")
class Account {
    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String phone;

    private String email;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "account_role", joinColumns = @JoinColumn(name = "account_id"))
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private Set<Role> roles = EnumSet.noneOf(Role.class);

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Account() {}

    Account(UUID id, String phone, Instant createdAt) {
        this.id = id;
        this.phone = phone;
        this.createdAt = createdAt;
    }

    UUID id() { return id; }
    String phone() { return phone; }
    Set<Role> roles() { return roles; }
    boolean isNew() { return roles.isEmpty(); }
    void grant(Role role) { roles.add(role); }
    void email(String email) { this.email = email; }

    AccountView view() {
        return new AccountView(id, phone, email, Set.copyOf(roles), createdAt);
    }
}
