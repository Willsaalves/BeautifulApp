package com.beautifulapp.review.internal;

import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.ContentFlagged;
import com.beautifulapp.common.ContentModerated;

/** Avaliação com denúncias suficientes sai da página pública (e da média) até a revisão. */
@Component
class ReviewModerationListener {
    private final JdbcClient jdbc;

    ReviewModerationListener(JdbcClient jdbc) { this.jdbc = jdbc; }

    /** Decisão da moderação: volta à página (improcedente) ou fica fora de vez (continua guardada, sem aparecer). */
    @EventListener
    void on(ContentModerated e) {
        if (!"REVIEW".equals(e.targetType())) return;
        jdbc.sql(e.decision() == ContentModerated.Decision.RESTORE
                        ? "UPDATE review SET hidden_at = NULL WHERE id = :id"
                        : "UPDATE review SET hidden_at = coalesce(hidden_at, now()) WHERE id = :id")
                .param("id", e.targetId()).update();
    }

    @EventListener
    void on(ContentFlagged e) {
        if (!"REVIEW".equals(e.targetType())) return;
        jdbc.sql("UPDATE review SET hidden_at = now() WHERE id = :id AND hidden_at IS NULL").param("id", e.targetId()).update();
    }
}
