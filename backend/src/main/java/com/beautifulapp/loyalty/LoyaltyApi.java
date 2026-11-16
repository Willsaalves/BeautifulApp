package com.beautifulapp.loyalty;

import java.util.Optional;
import java.util.UUID;

public interface LoyaltyApi {
    /** Usa o voucher no agendamento e devolve o % de desconto. Erro se não for dela, já usado ou de outra profissional. */
    int redeem(UUID clientAccountId, UUID professionalId, UUID voucherId, UUID appointmentId);

    /** Agendamento cancelado/expirado: o voucher volta a ficar disponível. */
    void release(UUID appointmentId);

    /** Voucher do app por avaliação: no máximo 1 por mês. Vazio se já ganhou neste mês. */
    Optional<VoucherView> grantFeedbackVoucher(UUID clientAccountId);
}
