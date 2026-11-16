package com.beautifulapp.identity.internal;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ConsentRepository extends JpaRepository<Consent, UUID> {}
