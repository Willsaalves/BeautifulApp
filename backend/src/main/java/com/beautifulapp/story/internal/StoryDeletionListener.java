package com.beautifulapp.story.internal;

import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.AccountDeleted;
import com.beautifulapp.common.ContentFlagged;

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

    /** Denúncias suficientes: o story sai do ar até a revisão. */
    @EventListener
    void on(ContentFlagged e) {
        if (!"STORY".equals(e.targetType())) return;
        jdbc.sql("UPDATE story SET hidden_at = now() WHERE id = :id AND hidden_at IS NULL").param("id", e.targetId()).update();
    }
}
