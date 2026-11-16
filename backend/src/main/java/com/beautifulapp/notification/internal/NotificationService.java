package com.beautifulapp.notification.internal;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.beautifulapp.common.AppointmentEvent;
import com.beautifulapp.common.Ids;
import com.beautifulapp.notification.NotificationApi;
import com.beautifulapp.profile.ProfileApi;

@Service
class NotificationService implements NotificationApi {
    private final NotificationRepository notifications;
    private final DeviceRepository devices;
    private final PushSender push;
    private final ProfileApi profiles;
    private final Clock clock;
    private final DateTimeFormatter when;

    NotificationService(NotificationRepository notifications, DeviceRepository devices, PushSender push, ProfileApi profiles, Clock clock,
                        @Value("${app.scheduling.zone:America/Sao_Paulo}") String zone) {
        this.notifications = notifications;
        this.devices = devices;
        this.push = push;
        this.profiles = profiles;
        this.clock = clock;
        this.when = DateTimeFormatter.ofPattern("dd/MM 'às' HH:mm").withZone(ZoneId.of(zone));
    }

    record NotificationView(UUID id, String kind, String title, String body, UUID appointmentId, Instant createdAt, boolean read) {}

    record Inbox(long unread, List<NotificationView> items) {}

    @Override
    @Transactional
    public void notify(UUID accountId, String kind, String title, String body, UUID appointmentId) {
        notifications.save(new Notification(Ids.newId(), accountId, kind, title, body, appointmentId, clock.instant()));
        List<PushSender.Message> msgs = devices.findByAccountId(accountId).stream()
                .map(d -> new PushSender.Message(d.token, title, body,
                        appointmentId == null ? Map.<String, Object>of("kind", kind) : Map.<String, Object>of("kind", kind, "appointmentId", appointmentId.toString())))
                .toList();
        if (msgs.isEmpty()) return;
        Runnable send = () -> push.send(msgs).forEach(this::forgetDevice);
        // só depois do commit: nunca avisar algo que foi desfeito
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() { Thread.ofVirtual().start(send); }
            });
        } else {
            Thread.ofVirtual().start(send);
        }
    }

    void forgetDevice(String token) { devices.deleteByToken(token); }

    /** Quem recebe e o que diz, para cada mudança no agendamento. */
    @EventListener
    @Transactional
    public void on(AppointmentEvent e) {
        String svc = e.serviceName();
        String at = e.startsAt() == null ? "" : when.format(e.startsAt());
        UUID client = e.clientAccountId();
        UUID pro = profiles.accountOfProfessional(e.professionalId()).orElse(null);
        String name = e.kind().name();
        switch (e.kind()) {
            case CREATED -> to(pro, name, "Novo agendamento ✨", "%s · %s".formatted(svc, at), e);
            case RECEIPT_SENT -> to(pro, name, "Comprovante recebido", "Confira o Pix do sinal de %s (%s).".formatted(svc, at), e);
            case DEPOSIT_CONFIRMED -> to(client, name, "Horário confirmado 💜", "%s · %s".formatted(svc, at), e);
            case RECEIPT_REJECTED -> to(client, name, "Comprovante recusado", "Envie um novo comprovante do sinal de %s.".formatted(svc), e);
            case ADJUSTMENT_PROPOSED -> to(client, name, "Novo valor proposto", "A profissional sugeriu um novo valor para %s. Toque para responder.".formatted(svc), e);
            case ADJUSTMENT_ACCEPTED -> to(pro, name, "Novo valor aceito", "%s · %s".formatted(svc, at), e);
            case ADJUSTMENT_DECLINED -> to(pro, name, "Novo valor recusado", "A cliente manteve o valor original de %s.".formatted(svc), e);
            case COMPLETED -> to(client, name, "Como foi seu %s?".formatted(svc.toLowerCase()), "Avalie e ganhe um bônus do mês no app.", e);
            case CANCELLED_BY_CLIENT -> to(pro, name, "Agendamento cancelado", "A cliente cancelou %s (%s). O horário está livre.".formatted(svc, at), e);
            case CANCELLED_BY_PROFESSIONAL -> to(client, name, "Agendamento cancelado", "A profissional cancelou %s (%s).".formatted(svc, at), e);
            case EXPIRED -> {
                to(client, name, "Horário liberado", "O sinal de %s não foi pago a tempo. Agende de novo quando quiser.".formatted(svc), e);
                to(pro, name, "Horário liberado", "Sinal não pago: %s (%s) voltou a ficar livre.".formatted(svc, at), e);
            }
            case DEPOSIT_DUE_SOON -> to(client, name, "Seu sinal vence em menos de 1h ⏱", "Pague o Pix de %s e anexe o comprovante para não perder o horário.".formatted(svc), e);
        }
    }

    private void to(UUID account, String kind, String title, String body, AppointmentEvent e) {
        if (account != null) notify(account, kind, title, body, e.appointmentId());
    }

    // ---------- caixa de entrada e dispositivos ----------

    @Transactional(readOnly = true)
    Inbox inbox(UUID account, int limit) {
        var items = notifications.findByAccountIdOrderByCreatedAtDesc(account, PageRequest.of(0, Math.min(Math.max(limit, 1), 100))).stream()
                .map(n -> new NotificationView(n.id, n.kind, n.title, n.body, n.appointmentId, n.createdAt, n.readAt != null)).toList();
        return new Inbox(notifications.countByAccountIdAndReadAtIsNull(account), items);
    }

    @Transactional
    void markAllRead(UUID account) { notifications.markAllRead(account, clock.instant()); }

    /** O mesmo celular pode trocar de conta: o token passa a pertencer a quem registrou por último. */
    @Transactional
    void registerDevice(UUID account, String token, String platform) {
        Instant now = clock.instant();
        devices.findByToken(token).ifPresentOrElse(d -> {
            d.accountId = account;
            d.platform = platform;
            d.lastSeenAt = now;
        }, () -> devices.save(new Device(Ids.newId(), account, token, platform, now)));
    }

    @Transactional
    void unregisterDevice(UUID account, String token) {
        devices.findByToken(token).filter(d -> d.accountId.equals(account)).ifPresent(devices::delete);
    }
}
