package com.beautifulapp.review.internal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.*;

@Entity
@Table(name = "review")
class Review {
    @Id UUID id;
    @Column(name = "appointment_id", nullable = false, unique = true) UUID appointmentId;
    @Column(name = "client_account_id", nullable = false) UUID clientAccountId;
    @Column(name = "professional_id", nullable = false) UUID professionalId;
    @Column(nullable = false) int rating;
    String comment;
    @Column(name = "created_at", nullable = false) Instant createdAt;

    protected Review() {}

    Review(UUID id, UUID appointmentId, UUID clientAccountId, UUID professionalId, int rating, String comment, Instant createdAt) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.clientAccountId = clientAccountId;
        this.professionalId = professionalId;
        this.rating = rating;
        this.comment = comment;
        this.createdAt = createdAt;
    }
}

interface ReviewRepository extends JpaRepository<Review, UUID> {
    boolean existsByAppointmentId(UUID appointmentId);

    List<Review> findByProfessionalIdOrderByCreatedAtDesc(UUID professionalId, Pageable page);

    List<Review> findByClientAccountIdOrderByCreatedAtDesc(UUID clientAccountId);

    @Query("select coalesce(avg(r.rating), 0), count(r) from Review r where r.professionalId = :pro")
    List<Object[]> summary(UUID pro);
}
