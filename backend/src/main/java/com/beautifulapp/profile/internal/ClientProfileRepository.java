package com.beautifulapp.profile.internal;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ClientProfileRepository extends JpaRepository<ClientProfile, UUID> {
    boolean existsByHandle(String handle);
}
