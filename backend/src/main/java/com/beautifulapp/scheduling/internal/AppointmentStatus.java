package com.beautifulapp.scheduling.internal;

import java.util.EnumSet;
import java.util.Set;

enum AppointmentStatus {
    AWAITING_DEPOSIT, RECEIPT_SENT, CONFIRMED, ADJUSTMENT_PENDING, COMPLETED, CANCELLED, EXPIRED;

    /** Ocupam o horário (mesma lista da exclusion constraint). */
    static final Set<AppointmentStatus> ACTIVE = EnumSet.of(AWAITING_DEPOSIT, RECEIPT_SENT, CONFIRMED, ADJUSTMENT_PENDING);

    boolean active() { return ACTIVE.contains(this); }
}
