package com.beautifulapp.profile.internal;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface FavoriteRepository extends JpaRepository<Favorite, Favorite.Key> {
    List<Favorite> findByClientAccountIdOrderByCreatedAtDesc(UUID clientAccountId);
}
