package com.beautifulapp.inventory.internal;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByProfessionalIdAndActiveTrueOrderByName(UUID professionalId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> lockById(UUID id);
}

interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    boolean existsByProductIdAndAppointmentIdAndReason(UUID productId, UUID appointmentId, Reason reason);

    @Query("select m from StockMovement m where m.productId in :products order by m.createdAt desc")
    List<StockMovement> recent(Collection<UUID> products, Pageable page);
}

interface ConsumptionRepository extends JpaRepository<ServiceConsumption, ServiceConsumption.Key> {
    List<ServiceConsumption> findByServiceId(UUID serviceId);

    List<ServiceConsumption> findByServiceIdIn(Collection<UUID> serviceIds);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from ServiceConsumption c where c.serviceId = :serviceId")
    void deleteAllOf(UUID serviceId);
}
