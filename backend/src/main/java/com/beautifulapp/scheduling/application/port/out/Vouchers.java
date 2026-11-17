package com.beautifulapp.scheduling.application.port.out;

import java.util.UUID;

/** Vouchers de fidelidade/avaliação (implementado sobre o módulo loyalty). */
public interface Vouchers {
    /** Reserva o voucher para o agendamento e devolve o % de desconto. */
    int redeem(UUID clientAccountId, UUID professionalId, UUID voucherId, UUID appointmentId);

    void release(UUID appointmentId);
}
