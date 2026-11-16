package com.beautifulapp.notification.internal;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.*;

@Entity
@Table(name = "device")
class Device {
    @Id UUID id;
    @Column(name = "account_id", nullable = false) UUID accountId;
    @Column(name = "expo_push_token", nullable = false, unique = true) String token;
    String platform;
    @Column(name = "created_at", nullable = false) Instant createdAt;
    @Column(name = "last_seen_at", nullable = false) Instant lastSeenAt;

    protected Device() {}

    Device(UUID id, UUID accountId, String token, String platform, Instant now) {
        this.id = id;
        this.accountId = accountId;
        this.token = token;
        this.platform = platform;
        this.createdAt = now;
        this.lastSeenAt = now;
    }
}

@Entity
@Table(name = "notification")
class Notification {
    @Id UUID id;
    @Column(name = "account_id", nullable = false) UUID accountId;
    @Column(nullable = false) String kind;
    @Column(nullable = false) String title;
    @Column(nullable = false) String body;
    @Column(name = "appointment_id") UUID appointmentId;
    @Column(name = "created_at", nullable = false) Instant createdAt;
    @Column(name = "read_at") Instant readAt;

    protected Notification() {}

    Notification(UUID id, UUID accountId, String kind, String title, String body, UUID appointmentId, Instant createdAt) {
        this.id = id;
        this.accountId = accountId;
        this.kind = kind;
        this.title = title;
        this.body = body;
        this.appointmentId = appointmentId;
        this.createdAt = createdAt;
    }
}

interface DeviceRepository extends JpaRepository<Device, UUID> {
    Optional<Device> findByToken(String token);

    List<Device> findByAccountId(UUID accountId);

    @Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("delete from Device d where d.token = :token")
    void deleteByToken(String token);
}

interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByAccountIdOrderByCreatedAtDesc(UUID accountId, Pageable page);

    long countByAccountIdAndReadAtIsNull(UUID accountId);

    @Modifying
    @Query("update Notification n set n.readAt = :now where n.accountId = :account and n.readAt is null")
    int markAllRead(UUID account, Instant now);
}
