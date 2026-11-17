package com.beautifulapp.scheduling.adapter.out.modules;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.beautifulapp.loyalty.LoyaltyApi;
import com.beautifulapp.scheduling.application.port.out.Vouchers;

/** Porta Vouchers sobre o módulo loyalty. */
@Component
class LoyaltyAdapter implements Vouchers {
    private final LoyaltyApi loyalty;

    LoyaltyAdapter(LoyaltyApi loyalty) { this.loyalty = loyalty; }

    @Override
    public int redeem(UUID clientAccountId, UUID professionalId, UUID voucherId, UUID appointmentId) {
        return loyalty.redeem(clientAccountId, professionalId, voucherId, appointmentId);
    }

    @Override
    public void release(UUID appointmentId) { loyalty.release(appointmentId); }
}
