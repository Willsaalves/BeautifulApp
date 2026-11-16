package com.beautifulapp.notification.internal;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.CurrentAccount;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/me")
@Tag(name = "notifications", description = "Caixa de entrada e push")
class NotificationController {
    private final NotificationService notifications;

    NotificationController(NotificationService notifications) { this.notifications = notifications; }

    record DeviceInput(@NotBlank @Pattern(regexp = "^(Exponent|Expo)PushToken\\[.+\\]$", message = "Token de push inválido.") String expoPushToken,
                       @Size(max = 10) String platform) {}

    @Operation(summary = "Minhas notificações (unread = não lidas)")
    @GetMapping("/notifications")
    NotificationService.Inbox inbox(@RequestParam(defaultValue = "30") int limit) {
        return notifications.inbox(CurrentAccount.id(), limit);
    }

    @Operation(summary = "Marcar todas como lidas")
    @PostMapping("/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void readAll() { notifications.markAllRead(CurrentAccount.id()); }

    @Operation(summary = "Registrar este celular para push (token do Expo)")
    @PostMapping("/devices")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void register(@Valid @RequestBody DeviceInput body) {
        notifications.registerDevice(CurrentAccount.id(), body.expoPushToken(), body.platform());
    }

    @Operation(summary = "Parar push neste celular (logout)")
    @PostMapping("/devices/unregister")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unregister(@Valid @RequestBody DeviceInput body) {
        notifications.unregisterDevice(CurrentAccount.id(), body.expoPushToken());
    }
}
