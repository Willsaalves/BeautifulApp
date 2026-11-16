package com.beautifulapp.loyalty.internal;

import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.AccountDeleted;

/** Exclusão de conta: saldo de fidelidade e vouchers ainda não usados (os usados ficam, ligados a atendimentos). */
@Component
class LoyaltyDeletionListener {
    private final JdbcClient jdbc;

    LoyaltyDeletionListener(JdbcClient jdbc) { this.jdbc = jdbc; }

    @EventListener
    void on(AccountDeleted e) {
        jdbc.sql("DELETE FROM loyalty_balance WHERE client_account_id = :id").param("id", e.accountId()).update();
        jdbc.sql("DELETE FROM voucher WHERE client_account_id = :id AND used_at IS NULL").param("id", e.accountId()).update();
    }
}
