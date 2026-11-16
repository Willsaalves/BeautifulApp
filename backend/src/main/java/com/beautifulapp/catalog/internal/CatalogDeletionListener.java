package com.beautifulapp.catalog.internal;

import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.AccountDeleted;

/** Profissional excluída: serviços saem do ar (ninguém consegue agendar) e os designs somem da vitrine. */
@Component
class CatalogDeletionListener {
    private final JdbcClient jdbc;

    CatalogDeletionListener(JdbcClient jdbc) { this.jdbc = jdbc; }

    @EventListener
    void on(AccountDeleted e) {
        String pros = "(SELECT id FROM professional WHERE account_id = :id)";
        jdbc.sql("UPDATE service SET active = false WHERE professional_id IN " + pros).param("id", e.accountId()).update();
        jdbc.sql("DELETE FROM design WHERE professional_id IN " + pros).param("id", e.accountId()).update();
    }
}
