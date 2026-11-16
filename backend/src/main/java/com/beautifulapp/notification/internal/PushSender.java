package com.beautifulapp.notification.internal;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Envia push para os celulares. Devolve os tokens que não existem mais (para remover). */
interface PushSender {
    record Message(String to, String title, String body, Map<String, Object> data) {}

    List<String> send(List<Message> messages);
}

/** Dev/testes: só registra no log. */
@Component
@ConditionalOnProperty(name = "app.push.sender", havingValue = "log", matchIfMissing = true)
class LogPushSender implements PushSender {
    private static final Logger log = LoggerFactory.getLogger(LogPushSender.class);

    @Override
    public List<String> send(List<Message> messages) {
        messages.forEach(m -> log.info("[PUSH DEV] {} → {}: {}", m.to(), m.title(), m.body()));
        return List.of();
    }
}

/** Produção/testes no celular: API de push da Expo (https://exp.host/--/api/v2/push/send). */
@Component
@ConditionalOnProperty(name = "app.push.sender", havingValue = "expo")
class ExpoPushSender implements PushSender {
    private static final Logger log = LoggerFactory.getLogger(ExpoPushSender.class);
    private final RestClient http = RestClient.builder().baseUrl("https://exp.host").build();

    @Override
    @SuppressWarnings("unchecked")
    public List<String> send(List<Message> messages) {
        if (messages.isEmpty()) return List.of();
        try {
            var body = messages.stream().map(m -> Map.of("to", m.to(), "title", m.title(), "body", m.body(), "data", m.data(), "sound", "default")).toList();
            Map<String, Object> res = http.post().uri("/--/api/v2/push/send").body(body).retrieve().body(Map.class);
            List<Map<String, Object>> tickets = res == null ? List.of() : (List<Map<String, Object>>) res.getOrDefault("data", List.of());
            List<String> dead = new java.util.ArrayList<>();
            for (int i = 0; i < tickets.size() && i < messages.size(); i++) {
                Object details = tickets.get(i).get("details");
                if (details instanceof Map<?, ?> d && "DeviceNotRegistered".equals(d.get("error"))) dead.add(messages.get(i).to());
            }
            return dead;
        } catch (RuntimeException e) {
            log.warn("Falha ao enviar push: {}", e.getMessage());
            return List.of();
        }
    }
}
