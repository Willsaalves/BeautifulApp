package com.beautifulapp.notification.internal;

import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.AccountDeleted;

/** Exclusão de conta: aparelhos (push) e caixa de notificações apagados. Roda por último, depois dos cancelamentos. */
@Component
class NotificationDeletionListener {
    private final JdbcClient jdbc;

    NotificationDeletionListener(JdbcClient jdbc) { this.jdbc = jdbc; }

    @EventListener
    @Order(1000)
    void on(AccountDeleted e) {
        jdbc.sql("DELETE FROM device WHERE account_id = :id").param("id", e.accountId()).update();
        jdbc.sql("DELETE FROM notification WHERE account_id = :id").param("id", e.accountId()).update();
    }
}
