package com.beautifulapp.profile.internal;

import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.AccountDeleted;

/** Exclusão de conta: perfis anonimizados (atendimentos antigos continuam legíveis), favoritas e planos apagados. */
@Component
class ProfileDeletionListener {
    private final JdbcClient jdbc;

    ProfileDeletionListener(JdbcClient jdbc) { this.jdbc = jdbc; }

    @EventListener
    void on(AccountDeleted e) {
        String handle = "excluida-" + e.accountId().toString().replace("-", "").substring(0, 20);
        var ts = java.sql.Timestamp.from(e.at());
        jdbc.sql("""
                UPDATE client_profile SET name = 'Conta excluída', handle = :handle, bio = NULL, photo_key = NULL, cover_key = NULL, updated_at = :at
                 WHERE account_id = :id""").param("handle", handle).param("at", ts).param("id", e.accountId()).update();
        jdbc.sql("""
                DELETE FROM favorite WHERE client_account_id = :id
                    OR professional_id IN (SELECT id FROM professional WHERE account_id = :id)""").param("id", e.accountId()).update();
        jdbc.sql("DELETE FROM next_procedure WHERE client_account_id = :id").param("id", e.accountId()).update();
        jdbc.sql("""
                UPDATE professional SET deleted_at = :at, name = 'Conta excluída', handle = :handle, bio = NULL, photo_key = NULL,
                       cover_key = NULL, pix_key = NULL, latitude = NULL, longitude = NULL, updated_at = :at
                 WHERE account_id = :id""").param("handle", handle).param("at", ts).param("id", e.accountId()).update();
    }
}
