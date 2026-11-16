package com.beautifulapp.moderation.internal;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.moderation.internal.ModerationService.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@Tag(name = "moderation", description = "Denunciar e bloquear")
class ModerationController {
    private final ModerationService moderation;

    ModerationController(ModerationService moderation) { this.moderation = moderation; }

    record ReportBody(@NotNull TargetType targetType, @NotNull UUID targetId, @NotNull Reason reason, @Size(max = 500) String details) {}
    record BlockBody(UUID accountId, UUID professionalId) {}

    @Operation(summary = "Denunciar perfil, story, avaliação ou mensagem (revisão em até 24h)")
    @PostMapping("/reports")
    @ResponseStatus(HttpStatus.CREATED)
    ReportView report(@Valid @RequestBody ReportBody in) {
        return moderation.report(CurrentAccount.id(), new ReportInput(in.targetType(), in.targetId(), in.reason(), in.details()));
    }

    @Operation(summary = "Pessoas que eu bloqueei")
    @GetMapping("/me/blocked")
    List<BlockedView> blocked() { return moderation.mine(CurrentAccount.id()); }

    @Operation(summary = "Bloquear uma cliente (accountId) ou profissional (professionalId): uma some para a outra e não dá para agendar nem conversar")
    @PostMapping("/me/blocked")
    BlockedView block(@RequestBody BlockBody in) {
        return moderation.block(CurrentAccount.id(), in.accountId(), in.professionalId());
    }

    @Operation(summary = "Desbloquear")
    @DeleteMapping("/me/blocked/{accountId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unblock(@PathVariable UUID accountId) { moderation.unblock(CurrentAccount.id(), accountId); }
}
