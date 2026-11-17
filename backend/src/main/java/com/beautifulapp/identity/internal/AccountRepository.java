package com.beautifulapp.identity.internal;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByPhone(String phone);

    boolean existsByIdAndDeletedAtIsNullAndSuspendedAtIsNull(UUID id);
}
