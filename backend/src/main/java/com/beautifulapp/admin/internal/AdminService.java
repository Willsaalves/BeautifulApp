package com.beautifulapp.admin.internal;

import java.time.Clock;
import java.util.Set;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.admin.internal.AdminDtos.*;
import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.ContentModerated;
import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.common.Ids;
import com.beautifulapp.identity.AccountView;
import com.beautifulapp.identity.IdentityApi;
import com.beautifulapp.moderation.ModerationApi;

/** Ações do painel. Cada uma passa pela API do módulo dono do dado e fica registrada em admin_action. */
@Service
class AdminService {
    private static final Set<String> CONTENT = Set.of("STORY", "REVIEW", "MESSAGE");
    private static final Set<String> TARGETS = Set.of("STORY", "REVIEW", "MESSAGE", "PROFESSIONAL", "CLIENT");

    private final IdentityApi identity;
    private final ModerationApi moderation;
    private final AdminQueries queries;
    private final ApplicationEventPublisher events;
    private final JdbcClient jdbc;
    private final Clock clock;

    AdminService(IdentityApi identity, ModerationApi moderation, AdminQueries queries, ApplicationEventPublisher events, JdbcClient jdbc, Clock clock) {
        this.identity = identity;
        this.moderation = moderation;
        this.queries = queries;
        this.events = events;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** Só administradores passam; devolve a conta de quem está agindo. */
    UUID requireAdmin() {
        UUID me = CurrentAccount.id();
        if (identity.find(me).filter(AccountView::admin).isEmpty()) {
            throw ApiException.forbidden("ADMIN_ONLY", "Área restrita à administração.");
        }
        return me;
    }

    @Transactional
    void resolve(String targetType, UUID targetId, ResolveInput in) {
        UUID admin = requireAdmin();
        if (!TARGETS.contains(targetType)) throw ApiException.badRequest("TARGET_INVALID", "Tipo de denúncia inválido.");
        String note = in.note() == null || in.note().isBlank() ? null : in.note().trim();
        boolean content = CONTENT.contains(targetType);

        switch (in.decision()) {
            case DISMISS -> {
                if (content) events.publishEvent(new ContentModerated(targetType, targetId, ContentModerated.Decision.RESTORE));
                closeReports(targetType, targetId, false, admin, note);
                audit(admin, "REPORT_DISMISSED", targetType, targetId, note);
            }
            case REMOVE_CONTENT -> {
                if (!content) throw ApiException.badRequest("REMOVE_NOT_CONTENT", "Perfis não são removidos: suspenda a conta.");
                events.publishEvent(new ContentModerated(targetType, targetId, ContentModerated.Decision.REMOVE));
                closeReports(targetType, targetId, true, admin, note);
                audit(admin, "CONTENT_REMOVED", targetType, targetId, note);
            }
            case SUSPEND_AUTHOR -> {
                UUID author = queries.preview(targetType, targetId).authorAccountId();
                if (author == null) throw ApiException.conflict("AUTHOR_UNKNOWN", "Não foi possível identificar a conta (o conteúdo já foi apagado).");
                if (content) events.publishEvent(new ContentModerated(targetType, targetId, ContentModerated.Decision.REMOVE));
                suspendAccount(admin, author, note != null ? note : "Denúncia procedente (" + targetType + ")");
                closeReports(targetType, targetId, true, admin, note);
                audit(admin, "REPORT_ACTIONED", targetType, targetId, note);
            }
        }
    }

    @Transactional
    void suspend(UUID accountId, String reason) {
        suspendAccount(requireAdmin(), accountId, reason.trim());
    }

    @Transactional
    void reactivate(UUID accountId) {
        UUID admin = requireAdmin();
        identity.reactivate(accountId);
        audit(admin, "ACCOUNT_REACTIVATED", "ACCOUNT", accountId, null);
    }

    @Transactional
    void delete(UUID accountId, String reason) {
        UUID admin = requireAdmin();
        guardTarget(admin, accountId);
        identity.delete(accountId);
        audit(admin, "ACCOUNT_DELETED", "ACCOUNT", accountId, reason);
    }

    private void suspendAccount(UUID admin, UUID accountId, String reason) {
        guardTarget(admin, accountId);
        identity.suspend(accountId, reason);
        audit(admin, "ACCOUNT_SUSPENDED", "ACCOUNT", accountId, reason);
    }

    /** Ninguém suspende/exclui a si mesmo nem outro administrador pelo painel. */
    private void guardTarget(UUID admin, UUID target) {
        if (admin.equals(target)) throw ApiException.badRequest("ADMIN_SELF", "Você não pode fazer isso com a sua própria conta.");
        var account = identity.find(target).orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Conta não encontrada."));
        if (account.admin()) throw ApiException.badRequest("ADMIN_TARGET", "Contas de administração não podem ser suspensas pelo painel.");
    }

    private void closeReports(String type, UUID id, boolean actioned, UUID admin, String note) {
        moderation.resolve(type, id, actioned, admin, note);
    }

    private void audit(UUID admin, String action, String targetType, UUID targetId, String note) {
        jdbc.sql("""
                INSERT INTO admin_action (id, admin_account_id, action, target_type, target_id, note, created_at)
                VALUES (:id, :admin, :action, :type, :target, :note, :at)""")
                .param("id", Ids.newId()).param("admin", admin).param("action", action).param("type", targetType).param("target", targetId)
                .param("note", note).param("at", java.sql.Timestamp.from(clock.instant())).update();
    }
}
