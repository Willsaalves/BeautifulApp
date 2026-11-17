package com.beautifulapp.admin.internal;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.admin.internal.AdminDtos.*;
import com.beautifulapp.common.ApiException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/admin")
@Tag(name = "admin", description = "Painel de administração (só contas ADMIN)")
class AdminController {
    private final AdminService admin;
    private final AdminQueries queries;

    AdminController(AdminService admin, AdminQueries queries) {
        this.admin = admin;
        this.queries = queries;
    }

    @Operation(summary = "Números do app e saúde da moderação (SLA de 24h)")
    @GetMapping("/overview")
    Overview overview() {
        admin.requireAdmin();
        return queries.overview();
    }

    @Operation(summary = "Denúncias abertas, agrupadas por conteúdo, mais antigas primeiro")
    @GetMapping("/reports")
    List<ReportGroup> reports() {
        admin.requireAdmin();
        return queries.openReports();
    }

    @Operation(summary = "Decidir: manter (DISMISS), remover o conteúdo (REMOVE_CONTENT) ou suspender quem publicou (SUSPEND_AUTHOR)")
    @PostMapping("/reports/{targetType}/{targetId}/resolve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resolve(@PathVariable String targetType, @PathVariable UUID targetId, @Valid @RequestBody ResolveInput body) {
        admin.resolve(targetType, targetId, body);
    }

    @Operation(summary = "Buscar contas por nome, estúdio, @ ou celular")
    @GetMapping("/accounts")
    List<AccountRow> accounts(@RequestParam(required = false) String q) {
        admin.requireAdmin();
        return queries.searchAccounts(q);
    }

    @Operation(summary = "Detalhe da conta: perfil, números, denúncias abertas e histórico de ações")
    @GetMapping("/accounts/{id}")
    AccountDetail account(@PathVariable UUID id) {
        admin.requireAdmin();
        return queries.account(id).orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Conta não encontrada."));
    }

    @Operation(summary = "Suspender (login e sessões param; some da busca; stories saem do ar)")
    @PostMapping("/accounts/{id}/suspend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void suspend(@PathVariable UUID id, @Valid @RequestBody SuspendInput body) { admin.suspend(id, body.reason()); }

    @Operation(summary = "Reativar conta suspensa")
    @PostMapping("/accounts/{id}/reactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void reactivate(@PathVariable UUID id) { admin.reactivate(id); }

    @Operation(summary = "Excluir conta (mesmo efeito de a pessoa excluir pelo app)")
    @PostMapping("/accounts/{id}/delete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id, @Valid @RequestBody SuspendInput body) { admin.delete(id, body.reason()); }

    @Operation(summary = "Histórico de ações da administração")
    @GetMapping("/audit")
    List<AuditEntry> audit() {
        admin.requireAdmin();
        return queries.audit(null);
    }
}
