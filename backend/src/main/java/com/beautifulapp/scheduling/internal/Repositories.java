package com.beautifulapp.scheduling.internal;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface WorkHoursRepository extends JpaRepository<WorkHours, WorkHours.Key> {
    List<WorkHours> findByProfessionalIdOrderByWeekday(UUID professionalId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from WorkHours w where w.professionalId = :pro")
    void deleteAllOf(UUID pro);
}

interface TimeBlockRepository extends JpaRepository<TimeBlock, UUID> {
    @Query("select b from TimeBlock b where b.professionalId = :pro and b.startsAt < :to and b.endsAt > :from order by b.startsAt")
    List<TimeBlock> overlapping(UUID pro, Instant from, Instant to);
}

interface AppointmentRepository extends JpaRepository<Appointment, UUID> {
    @Query("""
            select a from Appointment a where a.professionalId = :pro and a.status in :statuses
              and a.startsAt < :to and a.endsAt > :from order by a.startsAt""")
    List<Appointment> overlapping(UUID pro, Instant from, Instant to, Collection<AppointmentStatus> statuses);

    @Query("select a from Appointment a where a.professionalId = :pro and a.startsAt >= :from and a.startsAt < :to order by a.startsAt")
    List<Appointment> agenda(UUID pro, Instant from, Instant to);

    List<Appointment> findTop100ByClientAccountIdOrderByStartsAtDesc(UUID clientAccountId);

    /** Política de cancelamento: sinal não pago até o prazo libera o horário. */
    List<Appointment> findByStatusAndDepositDueAtBefore(AppointmentStatus status, Instant now);

    /** Sinais que vencem em breve e ainda não foram lembrados. */
    List<Appointment> findByStatusAndDepositRemindedAtIsNullAndDepositDueAtBetween(AppointmentStatus status, Instant from, Instant to);

    @Query("select a from Appointment a where (a.clientAccountId = :account or a.professionalId = :pro) and a.status in :statuses")
    List<Appointment> activeOf(UUID account, UUID pro, Collection<AppointmentStatus> statuses);

    boolean existsByClientAccountIdAndProfessionalIdAndStatus(UUID client, UUID pro, AppointmentStatus status);
}
