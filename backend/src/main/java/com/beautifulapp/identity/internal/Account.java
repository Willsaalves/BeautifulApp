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

    @Column(name = "suspended_at")
    private Instant suspendedAt;

    @Column(name = "suspended_reason")
    private String suspendedReason;

    protected Account() {}

    Account(UUID id, String phone, Instant createdAt) {
        this.id = id;
        this.phone = phone;
        this.createdAt = createdAt;
    }

    UUID id() { return id; }
    String phone() { return phone; }
    Set<Role> roles() { return roles; }
    boolean isNew() { return roles.stream().noneMatch(r -> r != Role.ADMIN); }
    void grant(Role role) { roles.add(role); }
    void email(String email) { this.email = email; }
    boolean deleted() { return deletedAt != null; }
    boolean suspended() { return suspendedAt != null; }

    void suspend(String reason, Instant now) {
        this.suspendedAt = now;
        this.suspendedReason = reason;
    }

    void reactivate() {
        this.suspendedAt = null;
        this.suspendedReason = null;
    }

    /** A lista de celulares administradores é a fonte da verdade: entra e sai do papel a cada login. */
    void syncAdmin(boolean admin) {
        if (admin) roles.add(Role.ADMIN);
        else roles.remove(Role.ADMIN);
    }

    /** Anonimiza: o celular é liberado (pode criar conta nova) e o e-mail some. */
    void markDeleted(Instant now) {
        this.phone = "del:" + id.toString().replace("-", "").substring(16);
        this.email = null;
        this.roles.clear();
        this.deletedAt = now;
    }

    AccountView view() {
        return new AccountView(id, phone, email, Set.copyOf(roles), createdAt, suspendedAt, suspendedReason, deletedAt);
    }
}
