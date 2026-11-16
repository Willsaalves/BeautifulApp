package com.beautifulapp.moderation.internal;

import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.beautifulapp.common.AccountDeleted;
import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.ContentFlagged;
import com.beautifulapp.common.Ids;
import com.beautifulapp.moderation.ModerationApi;
import com.beautifulapp.profile.ProfileApi;

@Service
class ModerationService implements ModerationApi {
    private static final Logger log = LoggerFactory.getLogger(ModerationService.class);
    /** Denúncias de pessoas diferentes para tirar um story/avaliação do ar até a revisão. */
    static final int HIDE_THRESHOLD = 3;

    enum TargetType { PROFESSIONAL, CLIENT, STORY, REVIEW, MESSAGE }
    enum Reason { SPAM, INAPPROPRIATE, HARASSMENT, FAKE, OTHER }

    record ReportInput(TargetType targetType, UUID targetId, Reason reason, String details) {}
    record ReportView(UUID id, TargetType targetType, UUID targetId, Reason reason, String status, Instant createdAt) {}
    record BlockedView(UUID accountId, UUID professionalId, String name, String photoUrl, Instant blockedAt) {}

    private final JdbcClient jdbc;
    private final ProfileApi profiles;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    ModerationService(JdbcClient jdbc, ProfileApi profiles, ApplicationEventPublisher events, Clock clock) {
        this.jdbc = jdbc;
        this.profiles = profiles;
        this.events = events;
        this.clock = clock;
    }

    // ---------- denúncias ----------

    @Transactional
    ReportView report(UUID reporter, ReportInput in) {
        if (in.targetType() == null || in.targetId() == null || in.reason() == null) {
            throw ApiException.badRequest("REPORT_FIELDS", "Escolha o motivo da denúncia.");
        }
        if (in.targetType() == TargetType.CLIENT && in.targetId().equals(reporter)
                || in.targetType() == TargetType.PROFESSIONAL && profiles.accountOfProfessional(in.targetId()).filter(reporter::equals).isPresent()) {
            throw ApiException.badRequest("REPORT_SELF", "Você não pode denunciar a si mesma.");
        }
        String details = StringUtils.hasText(in.details()) ? in.details().trim() : null;
        if (details != null && details.length() > 500) details = details.substring(0, 500);
        UUID id = Ids.newId();
        Instant now = clock.instant();
        int inserted = jdbc.sql("""
                INSERT INTO report (id, reporter_account_id, target_type, target_id, reason, details, created_at)
                VALUES (:id, :reporter, :type, :target, :reason, :details, :at)
                ON CONFLICT (reporter_account_id, target_type, target_id) DO NOTHING""")
                .param("id", id).param("reporter", reporter).param("type", in.targetType().name()).param("target", in.targetId())
                .param("reason", in.reason().name()).param("details", details).param("at", java.sql.Timestamp.from(now)).update();
        if (inserted == 0) {
            // denunciar de novo o mesmo conteúdo não conta duas vezes
            return jdbc.sql("""
                    SELECT id, target_type, target_id, reason, status, created_at FROM report
                     WHERE reporter_account_id = :r AND target_type = :t AND target_id = :id""")
                    .param("r", reporter).param("t", in.targetType().name()).param("id", in.targetId())
                    .query((rs, i) -> new ReportView(rs.getObject("id", UUID.class), TargetType.valueOf(rs.getString("target_type")),
                            rs.getObject("target_id", UUID.class), Reason.valueOf(rs.getString("reason")), rs.getString("status"),
                            rs.getTimestamp("created_at").toInstant())).single();
        }
        log.warn("[DENÚNCIA] {} {} motivo={} por {}", in.targetType(), in.targetId(), in.reason(), reporter);

        if (in.targetType() == TargetType.STORY || in.targetType() == TargetType.REVIEW) {
            int count = jdbc.sql("SELECT count(DISTINCT reporter_account_id) FROM report WHERE target_type = :t AND target_id = :id AND status = 'OPEN'")
                    .param("t", in.targetType().name()).param("id", in.targetId()).query(Integer.class).single();
            if (count == HIDE_THRESHOLD) events.publishEvent(new ContentFlagged(in.targetType().name(), in.targetId()));
        }
        return new ReportView(id, in.targetType(), in.targetId(), in.reason(), "OPEN", now);
    }

    // ---------- bloqueios ----------

    /** Bloqueia por conta (cliente) ou por profissional. */
    @Transactional
    BlockedView block(UUID me, UUID accountId, UUID professionalId) {
        UUID target = accountId != null ? accountId
                : professionalId == null ? null
                : profiles.accountOfProfessional(professionalId)
                        .orElseThrow(() -> ApiException.notFound("PROFESSIONAL_NOT_FOUND", "Profissional não encontrada."));
        if (target == null) throw ApiException.badRequest("BLOCK_TARGET", "Informe quem bloquear.");
        if (target.equals(me)) throw ApiException.badRequest("BLOCK_SELF", "Você não pode bloquear a si mesma.");
        jdbc.sql("""
                INSERT INTO account_block (blocker_account_id, blocked_account_id, created_at) VALUES (:me, :target, :at)
                ON CONFLICT DO NOTHING""").param("me", me).param("target", target).param("at", java.sql.Timestamp.from(clock.instant())).update();
        return mine(me).stream().filter(b -> b.accountId().equals(target)).findFirst().orElseThrow();
    }

    @Transactional
    void unblock(UUID me, UUID accountId) {
        jdbc.sql("DELETE FROM account_block WHERE blocker_account_id = :me AND blocked_account_id = :t").param("me", me).param("t", accountId).update();
    }

    @Transactional(readOnly = true)
    List<BlockedView> mine(UUID me) {
        record Row(UUID account, Instant at) {}
        return jdbc.sql("SELECT blocked_account_id, created_at FROM account_block WHERE blocker_account_id = :me ORDER BY created_at DESC")
                .param("me", me).query((rs, i) -> new Row(rs.getObject(1, UUID.class), rs.getTimestamp(2).toInstant())).list()
                .stream().map(r -> {
                    UUID pro = profiles.professionalIdOf(r.account()).orElse(null);
                    var pp = pro == null ? null : profiles.publicProfessional(pro).orElse(null);
                    if (pp != null) return new BlockedView(r.account(), pro, pp.studio(), pp.photoUrl(), r.at());
                    var c = profiles.clientSummary(r.account()).orElse(null);
                    return new BlockedView(r.account(), null, c == null ? "Cliente" : c.name(), c == null ? null : c.photoUrl(), r.at());
                }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean blockedBetween(UUID a, UUID b) {
        if (a == null || b == null) return false;
        return jdbc.sql("""
                SELECT EXISTS (SELECT 1 FROM account_block
                 WHERE (blocker_account_id = :a AND blocked_account_id = :b) OR (blocker_account_id = :b AND blocked_account_id = :a))""")
                .param("a", a).param("b", b).query(Boolean.class).single();
    }

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> blockedWith(UUID accountId) {
        return new HashSet<>(jdbc.sql("""
                SELECT blocked_account_id FROM account_block WHERE blocker_account_id = :id
                UNION SELECT blocker_account_id FROM account_block WHERE blocked_account_id = :id""")
                .param("id", accountId).query(UUID.class).list());
    }

    /** Exclusão de conta: bloqueios dela somem (as denúncias ficam para a revisão). */
    @EventListener
    void on(AccountDeleted e) {
        jdbc.sql("DELETE FROM account_block WHERE blocker_account_id = :id OR blocked_account_id = :id").param("id", e.accountId()).update();
    }
}
