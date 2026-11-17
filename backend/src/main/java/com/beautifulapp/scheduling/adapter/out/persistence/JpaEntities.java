package com.beautifulapp.scheduling.adapter.out.persistence;

import java.io.Serializable;
import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.beautifulapp.scheduling.domain.AppointmentStatus;

import jakarta.persistence.*;

/** Mapeamento das tabelas. Não sai deste pacote: o resto do módulo só vê o domínio. */
@Entity(name = "WorkHoursRow")
@Table(name = "work_hours")
@IdClass(WorkHoursRow.Key.class)
class WorkHoursRow {
    @Id @Column(name = "professional_id") UUID professionalId;
    @Id short weekday;
    @Column(name = "start_time", nullable = false) LocalTime start;
    @Column(name = "end_time", nullable = false) LocalTime end;

    protected WorkHoursRow() {}

    WorkHoursRow(UUID professionalId, short weekday, LocalTime start, LocalTime end) {
        this.professionalId = professionalId;
        this.weekday = weekday;
        this.start = start;
        this.end = end;
    }

    record Key(UUID professionalId, short weekday) implements Serializable {
        Key() { this(null, (short) 0); }
    }
}

@Entity(name = "TimeBlockRow")
@Table(name = "time_block")
class TimeBlockRow {
    @Id UUID id;
    @Column(name = "professional_id", nullable = false) UUID professionalId;
    @Column(name = "starts_at", nullable = false) Instant startsAt;
    @Column(name = "ends_at", nullable = false) Instant endsAt;
    String reason;
    @Column(name = "created_at", nullable = false) Instant createdAt;

    protected TimeBlockRow() {}
}

@Embeddable
class SelectionRow {
    @Column(name = "option_id", nullable = false) UUID optionId;
    @Column(name = "choice_id", nullable = false) UUID choiceId;
    @Column(name = "option_label", nullable = false) String optionLabel;
    @Column(name = "choice_label", nullable = false) String choiceLabel;
    @Column(name = "price_delta_cents", nullable = false) long priceDeltaCents;

    protected SelectionRow() {}

    SelectionRow(UUID optionId, UUID choiceId, String optionLabel, String choiceLabel, long priceDeltaCents) {
        this.optionId = optionId;
        this.choiceId = choiceId;
        this.optionLabel = optionLabel;
        this.choiceLabel = choiceLabel;
        this.priceDeltaCents = priceDeltaCents;
    }
}

@Entity(name = "AppointmentRow")
@Table(name = "appointment")
class AppointmentRow {
    @Id UUID id;
    @Column(name = "client_account_id", nullable = false) UUID clientAccountId;
    @Column(name = "professional_id", nullable = false) UUID professionalId;
    @Column(name = "service_id", nullable = false) UUID serviceId;
    @Column(name = "service_name", nullable = false) String serviceName;
    @Column(name = "design_id") UUID designId;
    @Column(name = "design_name") String designName;
    @Column(name = "starts_at", nullable = false) Instant startsAt;
    @Column(name = "ends_at", nullable = false) Instant endsAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false) AppointmentStatus status;
    @Enumerated(EnumType.STRING) @Column(name = "previous_status") AppointmentStatus previousStatus;
    @Column(name = "price_cents", nullable = false) long priceCents;
    @Column(name = "discount_cents", nullable = false) long discountCents;
    @Column(name = "deposit_cents", nullable = false) long depositCents;
    @Column(name = "deposit_due_at") Instant depositDueAt;
    @Column(name = "receipt_key") String receiptKey;
    @Column(name = "reference_key") String referenceKey;
    String notes;
    @Column(name = "adj_new_price_cents") Long adjNewPriceCents;
    @Column(name = "adj_note") String adjNote;
    @Column(name = "adj_status") String adjStatus;
    @Column(name = "cancelled_by") String cancelledBy;
    @Column(name = "deposit_reminded_at") Instant depositRemindedAt;
    @Column(name = "created_at", nullable = false) Instant createdAt;
    @Column(name = "updated_at", nullable = false) Instant updatedAt;
    @Version int version;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "appointment_selection", joinColumns = @JoinColumn(name = "appointment_id"))
    List<SelectionRow> selections = new ArrayList<>();

    protected AppointmentRow() {}

    AppointmentRow(UUID id) { this.id = id; }
}
