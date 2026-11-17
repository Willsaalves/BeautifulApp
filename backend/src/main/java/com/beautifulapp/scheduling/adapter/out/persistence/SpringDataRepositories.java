package com.beautifulapp.scheduling.adapter.out.persistence;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import com.beautifulapp.scheduling.domain.AppointmentStatus;

interface WorkHoursRows extends JpaRepository<WorkHoursRow, WorkHoursRow.Key> {
    List<WorkHoursRow> findByProfessionalIdOrderByWeekday(UUID professionalId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from WorkHoursRow w where w.professionalId = :pro")
    void deleteAllOf(UUID pro);
}

interface TimeBlockRows extends JpaRepository<TimeBlockRow, UUID> {
    @Query("select b from TimeBlockRow b where b.professionalId = :pro and b.startsAt < :to and b.endsAt > :from order by b.startsAt")
    List<TimeBlockRow> overlapping(UUID pro, Instant from, Instant to);
}

interface AppointmentRows extends JpaRepository<AppointmentRow, UUID> {
    @Query("""
            select a from AppointmentRow a where a.professionalId = :pro and a.status in :statuses
              and a.startsAt < :to and a.endsAt > :from order by a.startsAt""")
    List<AppointmentRow> overlapping(UUID pro, Instant from, Instant to, Collection<AppointmentStatus> statuses);

    @Query("select a from AppointmentRow a where a.professionalId = :pro and a.startsAt >= :from and a.startsAt < :to order by a.startsAt")
    List<AppointmentRow> agenda(UUID pro, Instant from, Instant to);

    List<AppointmentRow> findTop100ByClientAccountIdOrderByStartsAtDesc(UUID clientAccountId);

    List<AppointmentRow> findByStatusAndDepositDueAtBefore(AppointmentStatus status, Instant now);

    List<AppointmentRow> findByStatusAndDepositRemindedAtIsNullAndDepositDueAtBetween(AppointmentStatus status, Instant from, Instant to);

    @Query("select a from AppointmentRow a where (a.clientAccountId = :account or a.professionalId = :pro) and a.status in :statuses")
    List<AppointmentRow> activeOf(UUID account, UUID pro, Collection<AppointmentStatus> statuses);

    boolean existsByClientAccountIdAndProfessionalIdAndStatus(UUID client, UUID pro, AppointmentStatus status);
}
