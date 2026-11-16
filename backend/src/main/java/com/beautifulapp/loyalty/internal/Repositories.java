package com.beautifulapp.loyalty.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

interface ProgramRepository extends JpaRepository<LoyaltyProgram, UUID> {}

interface BalanceRepository extends JpaRepository<LoyaltyBalance, LoyaltyBalance.Key> {
    List<LoyaltyBalance> findByClientAccountId(UUID clientAccountId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from LoyaltyBalance b where b.clientAccountId = :client and b.professionalId = :pro")
    Optional<LoyaltyBalance> lock(UUID client, UUID pro);
}

interface VoucherRepository extends JpaRepository<Voucher, UUID> {
    List<Voucher> findByClientAccountIdOrderByCreatedAtDesc(UUID clientAccountId);

    List<Voucher> findByUsedAppointmentId(UUID appointmentId);

    boolean existsByClientAccountIdAndKindAndYearMonth(UUID clientAccountId, String kind, String yearMonth);
}
