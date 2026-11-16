package com.beautifulapp.review.internal;

import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.ContentFlagged;

/** Avaliação com denúncias suficientes sai da página pública (e da média) até a revisão. */
@Component
class ReviewModerationListener {
    private final JdbcClient jdbc;

    ReviewModerationListener(JdbcClient jdbc) { this.jdbc = jdbc; }

    @EventListener
    void on(ContentFlagged e) {
        if (!"REVIEW".equals(e.targetType())) return;
        jdbc.sql("UPDATE review SET hidden_at = now() WHERE id = :id AND hidden_at IS NULL").param("id", e.targetId()).update();
    }
}
