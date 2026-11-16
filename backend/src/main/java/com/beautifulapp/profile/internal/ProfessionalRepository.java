package com.beautifulapp.profile.internal;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ProfessionalRepository extends JpaRepository<Professional, UUID> {
    Optional<Professional> findByAccountId(UUID accountId);

    boolean existsByHandle(String handle);
}
