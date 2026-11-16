package com.beautifulapp.identity.internal;

import java.util.UUID;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface ConsentRepository extends JpaRepository<Consent, UUID> {
    @Query("select c from Consent c where c.accountId = :account and c.kind = :kind order by c.acceptedAt desc")
    List<Consent> history(UUID account, String kind);
}
