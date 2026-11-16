package com.beautifulapp.catalog.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface ServiceRepository extends JpaRepository<BeautyService, UUID> {
    List<BeautyService> findByProfessionalIdAndActiveTrueOrderByPositionAscCreatedAtAsc(UUID professionalId);

    Optional<BeautyService> findByIdAndActiveTrue(UUID id);

    @Query("select coalesce(max(s.position), -1) from BeautyService s where s.professionalId = :pro")
    int maxPosition(UUID pro);
}

interface DesignRepository extends JpaRepository<Design, UUID> {
    @Query("""
            select d from Design d where d.professionalId = :pro
              and exists (select 1 from BeautyService s where s.id = d.serviceId and s.active = true)
            order by d.position, d.createdAt""")
    List<Design> findVisibleByProfessional(UUID pro);
}
