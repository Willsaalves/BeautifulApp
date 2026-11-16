package com.beautifulapp.chat.internal;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.common.Ids;
import com.beautifulapp.moderation.ModerationApi;
import com.beautifulapp.notification.NotificationApi;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.scheduling.AppointmentInfo;
import com.beautifulapp.scheduling.SchedulingApi;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "chat_message")
class ChatMessage {
    @Id UUID id;
    @Column(name = "appointment_id", nullable = false) UUID appointmentId;
    @Column(name = "sender_account_id", nullable = false) UUID senderAccountId;
    @Column(name = "sender_role", nullable = false) String senderRole;
    @Column(nullable = false) String text;
    @Column(name = "created_at", nullable = false) Instant createdAt;

    protected ChatMessage() {}

    ChatMessage(UUID id, UUID appointmentId, UUID sender, String role, String text, Instant createdAt) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.senderAccountId = sender;
        this.senderRole = role;
        this.text = text;
        this.createdAt = createdAt;
    }
}

interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findByAppointmentIdOrderByCreatedAt(UUID appointmentId);
}

@RestController
@Tag(name = "chat", description = "Conversa do agendamento")
class ChatController {
    private final ChatMessageRepository messages;
    private final SchedulingApi scheduling;
    private final ProfileApi profiles;
    private final NotificationApi notifications;
    private final Clock clock;

    private final ModerationApi moderation;

    ChatController(ChatMessageRepository messages, SchedulingApi scheduling, ProfileApi profiles, NotificationApi notifications, Clock clock,
                   ModerationApi moderation) {
        this.moderation = moderation;
        this.messages = messages;
        this.scheduling = scheduling;
        this.profiles = profiles;
        this.notifications = notifications;
        this.clock = clock;
    }

    record MessageView(UUID id, String from, String text, Instant createdAt, boolean mine) {}

    record MessageInput(@NotBlank @Size(max = 1000) String text) {}

    @Operation(summary = "Mensagens do agendamento (só cliente e profissional dele)")
    @GetMapping("/appointments/{id}/messages")
    @Transactional(readOnly = true)
    List<MessageView> list(@PathVariable UUID id) {
        UUID me = CurrentAccount.id();
        roleIn(id, me);
        return messages.findByAppointmentIdOrderByCreatedAt(id).stream()
                .map(m -> new MessageView(m.id, m.senderRole, m.text, m.createdAt, m.senderAccountId.equals(me))).toList();
    }

    @Operation(summary = "Enviar mensagem (a outra parte recebe notificação)")
    @PostMapping("/appointments/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    MessageView send(@PathVariable UUID id, @Valid @RequestBody MessageInput body) {
        UUID me = CurrentAccount.id();
        AppointmentInfo a = scheduling.appointment(id).orElseThrow(ChatController::notFound);
        String role = roleIn(id, me);
        UUID otherSide = "CLIENT".equals(role) ? profiles.accountOfProfessional(a.professionalId()).orElse(null) : a.clientAccountId();
        if (moderation.blockedBetween(me, otherSide)) throw ApiException.forbidden("BLOCKED", "Não é possível enviar mensagens para esta pessoa.");
        ChatMessage m = messages.save(new ChatMessage(Ids.newId(), id, me, role, body.text().trim(), clock.instant()));
        UUID other = "CLIENT".equals(role) ? profiles.accountOfProfessional(a.professionalId()).orElse(null) : a.clientAccountId();
        if (other != null) {
            String preview = m.text.length() > 120 ? m.text.substring(0, 117) + "…" : m.text;
            notifications.notify(other, "CHAT_MESSAGE", "Nova mensagem · " + a.serviceName(), preview, id);
        }
        return new MessageView(m.id, role, m.text, m.createdAt, true);
    }

    /** CLIENT ou PROFESSIONAL; 404 para quem não participa (não revela que o agendamento existe). */
    private String roleIn(UUID appointmentId, UUID account) {
        AppointmentInfo a = scheduling.appointment(appointmentId).orElseThrow(ChatController::notFound);
        if (a.clientAccountId().equals(account)) return "CLIENT";
        boolean isPro = profiles.accountOfProfessional(a.professionalId()).map(account::equals).orElse(false);
        if (isPro) return "PROFESSIONAL";
        throw notFound();
    }

    private static ApiException notFound() {
        return ApiException.notFound("APPOINTMENT_NOT_FOUND", "Agendamento não encontrado.");
    }
}
