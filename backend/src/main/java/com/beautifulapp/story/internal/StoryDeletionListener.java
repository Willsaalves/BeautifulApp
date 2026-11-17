package com.beautifulapp.story.internal;

import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.AccountDeleted;
import com.beautifulapp.common.AccountSuspended;
import com.beautifulapp.common.ContentFlagged;
import com.beautifulapp.common.ContentModerated;

@Component
class StoryDeletionListener {
    private final JdbcClient jdbc;

    StoryDeletionListener(JdbcClient jdbc) { this.jdbc = jdbc; }

    /** Exclusão de conta: stories dela e os que marcavam o estúdio dela. */
    @EventListener
    void on(AccountDeleted e) {
        jdbc.sql("""
                DELETE FROM story WHERE author_account_id = :id
                    OR professional_id IN (SELECT id FROM professional WHERE account_id = :id)""").param("id", e.accountId()).update();
    }

    /** Conta suspensa: os stories dela saem do ar. */
    @EventListener
    void on(AccountSuspended e) {
        jdbc.sql("UPDATE story SET hidden_at = now() WHERE author_account_id = :id AND hidden_at IS NULL").param("id", e.accountId()).update();
    }

    /** Decisão da moderação: volta ao ar (denúncia improcedente) ou é apagado. */
    @EventListener
    void on(ContentModerated e) {
        if (!"STORY".equals(e.targetType())) return;
        if (e.decision() == ContentModerated.Decision.RESTORE) {
            jdbc.sql("UPDATE story SET hidden_at = NULL WHERE id = :id").param("id", e.targetId()).update();
        } else {
            jdbc.sql("DELETE FROM story WHERE id = :id").param("id", e.targetId()).update();
        }
    }

    /** Denúncias suficientes: o story sai do ar até a revisão. */
    @EventListener
    void on(ContentFlagged e) {
        if (!"STORY".equals(e.targetType())) return;
        jdbc.sql("UPDATE story SET hidden_at = now() WHERE id = :id AND hidden_at IS NULL").param("id", e.targetId()).update();
    }
}
