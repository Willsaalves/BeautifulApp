package com.beautifulapp.admin.internal;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.admin.internal.AdminDtos.*;
import com.beautifulapp.media.MediaApi;

/** Visão de leitura do painel (SQL sobre as tabelas dos módulos, só consulta). */
@Component
class AdminQueries {
    static final Duration SLA = Duration.ofHours(24);

    /** Denúncias abertas contra uma conta: perfil dela ou conteúdo que ela publicou. */
    private static final String OPEN_REPORTS_AGAINST = """
            (SELECT count(*) FROM report rp WHERE rp.status = 'OPEN' AND (
                   (rp.target_type = 'CLIENT' AND rp.target_id = a.id)
                OR (rp.target_type = 'PROFESSIONAL' AND rp.target_id IN (SELECT id FROM professional WHERE account_id = a.id))
                OR (rp.target_type = 'STORY' AND rp.target_id IN (SELECT id FROM story WHERE author_account_id = a.id))
                OR (rp.target_type = 'REVIEW' AND rp.target_id IN (SELECT id FROM review WHERE client_account_id = a.id))
                OR (rp.target_type = 'MESSAGE' AND rp.target_id IN (SELECT id FROM chat_message WHERE sender_account_id = a.id))))""";

    private static final String ACCOUNT_SELECT = """
            SELECT a.id, a.phone, a.email, a.created_at, a.suspended_at, a.suspended_reason, a.deleted_at,
                   c.name AS client_name, c.bio AS client_bio, c.photo_key AS client_photo,
                   p.id AS pro_id, p.studio, p.bio AS pro_bio, p.photo_key AS pro_photo, p.neighborhood,
                   EXISTS (SELECT 1 FROM account_role r WHERE r.account_id = a.id AND r.role = 'ADMIN') AS is_admin,
                   %s AS open_reports
              FROM account a
              LEFT JOIN client_profile c ON c.account_id = a.id
              LEFT JOIN professional p ON p.account_id = a.id
            """.formatted(OPEN_REPORTS_AGAINST);

    private final JdbcClient jdbc;
    private final MediaApi media;
    private final Clock clock;

    AdminQueries(JdbcClient jdbc, MediaApi media, Clock clock) {
        this.jdbc = jdbc;
        this.media = media;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    Overview overview() {
        Instant now = clock.instant();
        return jdbc.sql("""
                SELECT
                  (SELECT count(*) FROM client_profile c JOIN account a ON a.id = c.account_id WHERE a.deleted_at IS NULL) AS clients,
                  (SELECT count(*) FROM professional WHERE deleted_at IS NULL) AS professionals,
                  (SELECT count(*) FROM account WHERE deleted_at IS NULL AND created_at > :d7) AS new_accounts,
                  (SELECT count(*) FROM account WHERE suspended_at IS NOT NULL AND deleted_at IS NULL) AS suspended,
                  (SELECT count(*) FROM appointment WHERE created_at > :d7) AS appointments7d,
                  (SELECT count(*) FROM appointment WHERE status = 'COMPLETED' AND updated_at > :d30) AS completed30d,
                  (SELECT coalesce(sum(price_cents - discount_cents), 0) FROM appointment WHERE status = 'COMPLETED' AND updated_at > :d30) AS revenue,
                  (SELECT count(*) FROM (SELECT DISTINCT target_type, target_id FROM report WHERE status = 'OPEN') x) AS open_reports,
                  (SELECT min(created_at) FROM report WHERE status = 'OPEN') AS oldest,
                  (SELECT count(*) FROM event_publication WHERE completion_date IS NULL) AS outbox
                """)
                .param("d7", Timestamp.from(now.minus(Duration.ofDays(7)))).param("d30", Timestamp.from(now.minus(Duration.ofDays(30))))
                .query((rs, i) -> {
                    Instant oldest = instant(rs, "oldest");
                    return new Overview(rs.getLong("clients"), rs.getLong("professionals"), rs.getLong("new_accounts"), rs.getLong("suspended"),
                            rs.getLong("appointments7d"), rs.getLong("completed30d"), rs.getLong("revenue"), rs.getLong("open_reports"),
                            oldest, oldest != null && oldest.isBefore(now.minus(SLA)), rs.getLong("outbox"));
                }).single();
    }

    @Transactional(readOnly = true)
    List<ReportGroup> openReports() { return reportGroups("", Map.of()); }

    private List<ReportGroup> reportGroups(String extraWhere, Map<String, Object> params) {
        return jdbc.sql("""
                SELECT target_type, target_id, count(*) AS n, count(DISTINCT reporter_account_id) AS reporters,
                       array_agg(DISTINCT reason) AS reasons, array_remove(array_agg(details ORDER BY created_at), NULL) AS details,
                       min(created_at) AS first_at, max(created_at) AS last_at
                  FROM report WHERE status = 'OPEN' %s
                 GROUP BY target_type, target_id
                 ORDER BY min(created_at)
                 LIMIT 100""".formatted(extraWhere))
                .params(params)
                .query((rs, i) -> new ReportGroup(rs.getString("target_type"), rs.getObject("target_id", UUID.class), rs.getInt("n"),
                        rs.getInt("reporters"), strings(rs.getArray("reasons")), strings(rs.getArray("details")),
                        instant(rs, "first_at"), instant(rs, "last_at"), null)).list()
                .stream().map(g -> new ReportGroup(g.targetType(), g.targetId(), g.reports(), g.reporters(), g.reasons(), g.details(),
                        g.firstAt(), g.lastAt(), preview(g.targetType(), g.targetId()))).toList();
    }

    /** O que foi denunciado, para decidir sem sair do painel. */
    @Transactional(readOnly = true)
    Preview preview(String type, UUID id) {
        Optional<Preview> p = switch (type) {
            case "STORY" -> jdbc.sql("SELECT caption, image_key, author_account_id, hidden_at, professional_id, service_name FROM story WHERE id = :id")
                    .param("id", id).query((rs, i) -> {
                        UUID author = rs.getObject("author_account_id", UUID.class);
                        return new Preview(true, "Story" + (rs.getString("service_name") == null ? "" : " · " + rs.getString("service_name")),
                                rs.getString("caption"), media.publicUrl(rs.getString("image_key")), author, nameOf(author),
                                rs.getTimestamp("hidden_at") != null, rs.getObject("professional_id", UUID.class));
                    }).optional();
            case "REVIEW" -> jdbc.sql("SELECT rating, comment, client_account_id, hidden_at, professional_id FROM review WHERE id = :id")
                    .param("id", id).query((rs, i) -> {
                        UUID author = rs.getObject("client_account_id", UUID.class);
                        return new Preview(true, "Avaliação " + "★".repeat(rs.getInt("rating")), rs.getString("comment"), null, author,
                                nameOf(author), rs.getTimestamp("hidden_at") != null, rs.getObject("professional_id", UUID.class));
                    }).optional();
            case "MESSAGE" -> jdbc.sql("""
                    SELECT m.text, m.sender_account_id, a.professional_id FROM chat_message m JOIN appointment a ON a.id = m.appointment_id
                     WHERE m.id = :id""").param("id", id).query((rs, i) -> {
                        UUID author = rs.getObject("sender_account_id", UUID.class);
                        return new Preview(true, "Mensagem no chat", rs.getString("text"), null, author, nameOf(author), false,
                                rs.getObject("professional_id", UUID.class));
                    }).optional();
            case "PROFESSIONAL" -> jdbc.sql("SELECT studio, name, bio, photo_key, account_id FROM professional WHERE id = :id")
                    .param("id", id).query((rs, i) -> new Preview(true, "Perfil: " + rs.getString("studio"), rs.getString("bio"),
                            media.publicUrl(rs.getString("photo_key")), rs.getObject("account_id", UUID.class), rs.getString("name"), false, id))
                    .optional();
            case "CLIENT" -> jdbc.sql("SELECT name, bio, photo_key FROM client_profile WHERE account_id = :id")
                    .param("id", id).query((rs, i) -> new Preview(true, "Cliente: " + rs.getString("name"), rs.getString("bio"),
                            media.publicUrl(rs.getString("photo_key")), id, rs.getString("name"), false, null))
                    .optional();
            default -> Optional.empty();
        };
        return p.orElse(new Preview(false, "Conteúdo já apagado", null, null, null, null, true, null));
    }

    private String nameOf(UUID account) {
        if (account == null) return null;
        return jdbc.sql("""
                SELECT coalesce((SELECT studio FROM professional WHERE account_id = :a), (SELECT name FROM client_profile WHERE account_id = :a), 'Conta')""")
                .param("a", account).query(String.class).single();
    }

    @Transactional(readOnly = true)
    List<AccountRow> searchAccounts(String q) {
        String text = q == null ? "" : q.trim();
        String digits = text.replaceAll("\\D", "");
        StringBuilder sql = new StringBuilder(ACCOUNT_SELECT);
        Map<String, Object> params = new HashMap<>();
        if (!text.isEmpty()) {
            sql.append(" WHERE (c.name ILIKE :like OR p.studio ILIKE :like OR p.name ILIKE :like OR p.handle ILIKE :like OR c.handle ILIKE :like");
            params.put("like", "%" + text + "%");
            if (digits.length() >= 4) {
                sql.append(" OR a.phone LIKE :digits");
                params.put("digits", "%" + digits + "%");
            }
            sql.append(")");
        }
        sql.append(" ORDER BY a.created_at DESC LIMIT 50");
        return jdbc.sql(sql.toString()).params(params).query((rs, i) -> row(rs)).list();
    }

    @Transactional(readOnly = true)
    Optional<AccountDetail> account(UUID id) {
        return jdbc.sql(ACCOUNT_SELECT + " WHERE a.id = :id").param("id", id).query((rs, i) -> {
            AccountRow row = row(rs);
            boolean pro = row.professional();
            return new AccountDetail(row, rs.getString("email"), rs.getString("suspended_reason"),
                    pro ? rs.getString("pro_bio") : rs.getString("client_bio"),
                    media.publicUrl(pro ? rs.getString("pro_photo") : rs.getString("client_photo")),
                    rs.getString("neighborhood"), 0, 0, 0, List.of(), List.of());
        }).optional().map(d -> {
            UUID pro = d.account().professionalId();
            long asClient = count("SELECT count(*) FROM appointment WHERE client_account_id = :id", id);
            long asPro = pro == null ? 0 : count("SELECT count(*) FROM appointment WHERE professional_id = :id", pro);
            long done = pro == null ? 0 : count("SELECT count(*) FROM appointment WHERE professional_id = :id AND status = 'COMPLETED'", pro);
            List<ReportGroup> reports = reportGroups("""
                    AND ((target_type = 'CLIENT' AND target_id = :acc)
                      OR (target_type = 'PROFESSIONAL' AND target_id IN (SELECT id FROM professional WHERE account_id = :acc))
                      OR (target_type = 'STORY' AND target_id IN (SELECT id FROM story WHERE author_account_id = :acc))
                      OR (target_type = 'REVIEW' AND target_id IN (SELECT id FROM review WHERE client_account_id = :acc))
                      OR (target_type = 'MESSAGE' AND target_id IN (SELECT id FROM chat_message WHERE sender_account_id = :acc)))""",
                    Map.of("acc", id));
            return new AccountDetail(d.account(), d.email(), d.suspendedReason(), d.bio(), d.photoUrl(), d.neighborhood(),
                    asClient, asPro, done, reports, audit(id));
        });
    }

    @Transactional(readOnly = true)
    List<AuditEntry> audit(UUID targetOrNull) {
        String where = targetOrNull == null ? "" : " WHERE x.target_id = :t";
        var spec = jdbc.sql("""
                SELECT x.*, coalesce(c.name, p.name, 'Administrador') AS admin_name FROM admin_action x
                  LEFT JOIN client_profile c ON c.account_id = x.admin_account_id
                  LEFT JOIN professional p ON p.account_id = x.admin_account_id%s
                 ORDER BY x.created_at DESC LIMIT 100""".formatted(where));
        if (targetOrNull != null) spec = spec.param("t", targetOrNull);
        return spec.query((rs, i) -> new AuditEntry(rs.getObject("id", UUID.class), rs.getObject("admin_account_id", UUID.class),
                rs.getString("admin_name"), rs.getString("action"), rs.getString("target_type"), rs.getObject("target_id", UUID.class),
                rs.getString("note"), instant(rs, "created_at"))).list();
    }

    private long count(String sql, UUID id) { return jdbc.sql(sql).param("id", id).query(Long.class).single(); }

    private AccountRow row(ResultSet rs) throws SQLException {
        UUID pro = rs.getObject("pro_id", UUID.class);
        String name = pro != null ? rs.getString("studio") : rs.getString("client_name");
        return new AccountRow(rs.getObject("id", UUID.class), rs.getString("phone"), name == null ? "Sem perfil" : name, pro,
                rs.getString("client_name") != null, pro != null, rs.getBoolean("is_admin"), instant(rs, "created_at"),
                instant(rs, "suspended_at"), instant(rs, "deleted_at"), rs.getInt("open_reports"));
    }

    private static Instant instant(ResultSet rs, String col) throws SQLException {
        Timestamp t = rs.getTimestamp(col);
        return t == null ? null : t.toInstant();
    }

    private static List<String> strings(Array a) throws SQLException {
        if (a == null) return List.of();
        return new ArrayList<>(Arrays.stream((Object[]) a.getArray()).map(String::valueOf).toList());
    }
}
