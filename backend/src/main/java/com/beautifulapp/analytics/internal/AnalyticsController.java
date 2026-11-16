package com.beautifulapp.analytics.internal;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.media.MediaApi;
import com.beautifulapp.profile.ProfileApi;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/me/analytics")
@Tag(name = "analytics", description = "Painel de lucratividade e retorno de clientes")
class AnalyticsController {
    private final JdbcClient jdbc;
    private final ProfileApi profiles;
    private final MediaApi media;
    private final Clock clock;

    AnalyticsController(JdbcClient jdbc, ProfileApi profiles, MediaApi media, Clock clock) {
        this.jdbc = jdbc;
        this.profiles = profiles;
        this.media = media;
        this.clock = clock;
    }

    record ServiceRow(UUID serviceId, String serviceName, int count, long revenueCents, long costCents) {}

    record Profit(Instant from, Instant to, int count, long revenueCents, long costCents, long profitCents, int marginPercent,
                  long ticketCents, long purchasesCents, List<ServiceRow> rows) {}

    record OverdueClient(UUID clientAccountId, String name, String photoUrl, String phone, String serviceName, Instant lastAt, int daysLate) {}

    /** Lucro = faturamento − custo de material (consumo registrado no estoque × custo médio no momento da baixa). */
    @Operation(summary = "Painel de lucratividade no período (padrão: mês atual)")
    @GetMapping("/profit")
    @Transactional(readOnly = true)
    Profit profit(@RequestParam(required = false) Instant from, @RequestParam(required = false) Instant to) {
        UUID pro = profiles.requireProfessionalId(CurrentAccount.id());
        Instant now = clock.instant();
        Instant f = from != null ? from : now.minus(Duration.ofDays(30));
        Instant t = to != null ? to : now.plus(Duration.ofDays(1));
        Map<String, Object> p = Map.of("pro", pro, "from", Timestamp.from(f), "to", Timestamp.from(t));

        var revenue = jdbc.sql("""
                SELECT service_id, max(service_name) AS name, count(*) AS n, sum(price_cents - discount_cents) AS revenue
                  FROM appointment
                 WHERE professional_id = :pro AND status = 'COMPLETED' AND starts_at >= :from AND starts_at < :to
                 GROUP BY service_id""").params(p)
                .query((rs, i) -> new ServiceRow(rs.getObject("service_id", UUID.class), rs.getString("name"), rs.getInt("n"), rs.getLong("revenue"), 0)).list();
        Map<UUID, Long> costs = jdbc.sql("""
                SELECT a.service_id, coalesce(sum(-m.delta * coalesce(m.unit_cost_cents, 0)), 0) AS cost
                  FROM stock_movement m JOIN appointment a ON a.id = m.appointment_id
                 WHERE m.reason = 'ATTENDANCE' AND a.professional_id = :pro AND a.status = 'COMPLETED'
                   AND a.starts_at >= :from AND a.starts_at < :to
                 GROUP BY a.service_id""").params(p)
                .query((rs, i) -> Map.entry(rs.getObject("service_id", UUID.class), Math.round(rs.getDouble("cost")))).list()
                .stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        long purchases = Math.round(jdbc.sql("""
                SELECT coalesce(sum(m.delta * coalesce(m.unit_cost_cents, 0)), 0)
                  FROM stock_movement m JOIN product pr ON pr.id = m.product_id
                 WHERE pr.professional_id = :pro AND m.reason = 'PURCHASE' AND m.created_at >= :from AND m.created_at < :to""")
                .params(p).query(Double.class).single());

        List<ServiceRow> rows = revenue.stream()
                .map(r -> new ServiceRow(r.serviceId(), r.serviceName(), r.count(), r.revenueCents(), costs.getOrDefault(r.serviceId(), 0L)))
                .sorted((a, b) -> Long.compare(b.revenueCents() - b.costCents(), a.revenueCents() - a.costCents()))
                .toList();
        int count = rows.stream().mapToInt(ServiceRow::count).sum();
        long rev = rows.stream().mapToLong(ServiceRow::revenueCents).sum();
        long cost = rows.stream().mapToLong(ServiceRow::costCents).sum();
        return new Profit(f, t, count, rev, cost, rev - cost, rev == 0 ? 0 : (int) Math.round((rev - cost) * 100.0 / rev),
                count == 0 ? 0 : rev / count, purchases, rows);
    }

    @Operation(summary = "Clientes atrasadas para retorno (último atendimento + intervalo do serviço já passou e nada marcado)")
    @GetMapping("/overdue-clients")
    @Transactional(readOnly = true)
    List<OverdueClient> overdue() {
        UUID pro = profiles.requireProfessionalId(CurrentAccount.id());
        return jdbc.sql("""
                WITH last AS (
                  SELECT DISTINCT ON (a.client_account_id) a.client_account_id, a.service_id, a.service_name, a.starts_at
                    FROM appointment a
                   WHERE a.professional_id = :pro AND a.status = 'COMPLETED'
                   ORDER BY a.client_account_id, a.starts_at DESC)
                SELECT l.client_account_id, coalesce(cp.name, 'Cliente') AS name, cp.photo_key, acc.phone, l.service_name, l.starts_at,
                       floor(extract(epoch FROM (:now - (l.starts_at + make_interval(days => s.return_interval_days)))) / 86400)::int AS days_late
                  FROM last l
                  JOIN service s ON s.id = l.service_id
                  JOIN account acc ON acc.id = l.client_account_id
                  LEFT JOIN client_profile cp ON cp.account_id = l.client_account_id
                 WHERE s.return_interval_days > 0
                   AND l.starts_at + make_interval(days => s.return_interval_days) < :now
                   AND NOT EXISTS (SELECT 1 FROM appointment f WHERE f.client_account_id = l.client_account_id AND f.professional_id = :pro
                                     AND f.status IN ('AWAITING_DEPOSIT','RECEIPT_SENT','CONFIRMED','ADJUSTMENT_PENDING'))
                 ORDER BY days_late DESC
                 LIMIT 100""")
                .param("pro", pro).param("now", Timestamp.from(clock.instant()))
                .query((rs, i) -> new OverdueClient(rs.getObject("client_account_id", UUID.class), rs.getString("name"),
                        media.publicUrl(rs.getString("photo_key")), rs.getString("phone"), rs.getString("service_name"),
                        rs.getTimestamp("starts_at").toInstant(), rs.getInt("days_late"))).list();
    }

}
