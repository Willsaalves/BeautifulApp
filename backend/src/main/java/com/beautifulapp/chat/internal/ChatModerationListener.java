package com.beautifulapp.chat.internal;

import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.ContentModerated;

/** Mensagem removida pela moderação: o texto some da conversa (a mensagem continua, como aviso). */
@Component
class ChatModerationListener {
    static final String REMOVED = "Mensagem removida pela moderação.";

    private final JdbcClient jdbc;

    ChatModerationListener(JdbcClient jdbc) { this.jdbc = jdbc; }

    @EventListener
    void on(ContentModerated e) {
        if (!"MESSAGE".equals(e.targetType()) || e.decision() != ContentModerated.Decision.REMOVE) return;
        jdbc.sql("UPDATE chat_message SET text = :t WHERE id = :id").param("t", REMOVED).param("id", e.targetId()).update();
    }
}
