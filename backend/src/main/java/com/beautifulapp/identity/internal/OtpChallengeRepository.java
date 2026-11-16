package com.beautifulapp.identity.internal;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface OtpChallengeRepository extends JpaRepository<OtpChallenge, UUID> {
    long countByPhoneAndCreatedAtAfter(String phone, Instant after);

    Optional<OtpChallenge> findFirstByPhoneAndConsumedAtIsNullOrderByCreatedAtDesc(String phone);
}
