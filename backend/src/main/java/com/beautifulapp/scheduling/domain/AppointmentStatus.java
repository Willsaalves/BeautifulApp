package com.beautifulapp.scheduling.domain;

import java.util.EnumSet;
import java.util.Set;

public enum AppointmentStatus {
    AWAITING_DEPOSIT, RECEIPT_SENT, CONFIRMED, ADJUSTMENT_PENDING, COMPLETED, CANCELLED, EXPIRED;

    /** Ocupam o horário (mesma lista da exclusion constraint do banco). */
    public static final Set<AppointmentStatus> ACTIVE = EnumSet.of(AWAITING_DEPOSIT, RECEIPT_SENT, CONFIRMED, ADJUSTMENT_PENDING);

    public boolean active() { return ACTIVE.contains(this); }

    public String label() {
        return switch (this) {
            case AWAITING_DEPOSIT -> "aguardando o sinal";
            case RECEIPT_SENT -> "com comprovante em análise";
            case CONFIRMED -> "confirmado";
            case ADJUSTMENT_PENDING -> "com novo valor pendente";
            case COMPLETED -> "concluído";
            case CANCELLED -> "cancelado";
            case EXPIRED -> "expirado";
        };
    }
}
