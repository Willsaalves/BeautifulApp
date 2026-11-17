package com.beautifulapp.discovery.internal;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.beautifulapp.catalog.CatalogApi;
import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.discovery.internal.DiscoveryDtos.*;
import com.beautifulapp.media.MediaApi;
import com.beautifulapp.moderation.ModerationApi;
import com.beautifulapp.page.PageApi;
import com.beautifulapp.profile.Niche;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.review.ReviewApi;
import com.beautifulapp.scheduling.SchedulingApi;

@Service
class DiscoveryService {
    private final JdbcClient jdbc;
    private final MediaApi media;
    private final ProfileApi profiles;
    private final CatalogApi catalog;
    private final PageApi page;
    private final SchedulingApi scheduling;
    private final ReviewApi reviews;
    private final ModerationApi moderation;

    DiscoveryService(JdbcClient jdbc, MediaApi media, ProfileApi profiles, CatalogApi catalog, PageApi page, SchedulingApi scheduling, ReviewApi reviews,
                     ModerationApi moderation) {
        this.moderation = moderation;
        this.jdbc = jdbc;
        this.media = media;
        this.profiles = profiles;
        this.catalog = catalog;
        this.page = page;
        this.scheduling = scheduling;
        this.reviews = reviews;
    }

    record Query(Niche niche, String q, Double lat, Double lng, Double radiusKm, int limit) {}

    /** SQL montado conforme os filtros presentes (evita parâmetros nulos sem tipo no Postgres). */
    @Transactional(readOnly = true)
    List<ProfessionalCard> search(Query in) {
        Map<String, Object> params = new HashMap<>();
        boolean geo = in.lat() != null && in.lng() != null;
        String distance = geo
                ? "ST_Distance(p.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000.0"
                : "NULL::double precision";
        StringBuilder sql = new StringBuilder("""
                SELECT p.id, p.name, p.studio, p.handle, p.niche, p.bio, p.photo_key, p.cover_key, p.neighborhood, p.city,
                       %s AS distance_km,
                       (SELECT min(s.price_cents) FROM service s WHERE s.professional_id = p.id AND s.active) AS min_price,
                       (SELECT count(*) FROM service s WHERE s.professional_id = p.id AND s.active) AS services_count,
                       (SELECT avg(r.rating) FROM review r WHERE r.professional_id = p.id AND r.hidden_at IS NULL) AS rating,
                       (SELECT count(*) FROM review r WHERE r.professional_id = p.id AND r.hidden_at IS NULL) AS reviews
                  FROM professional p
                 WHERE p.deleted_at IS NULL
                   AND NOT EXISTS (SELECT 1 FROM account a WHERE a.id = p.account_id AND a.suspended_at IS NOT NULL)
                """.formatted(distance));
        excludeBlocked(sql, params);
        if (geo) {
            params.put("lat", in.lat());
            params.put("lng", in.lng());
        }
        if (in.niche() != null) {
            sql.append(" AND (p.niche = :niche OR EXISTS (SELECT 1 FROM service s WHERE s.professional_id = p.id AND s.active AND s.niche = :niche))");
            params.put("niche", in.niche().name());
        }
        if (StringUtils.hasText(in.q())) {
            sql.append(" AND (p.studio ILIKE :q OR p.name ILIKE :q OR p.neighborhood ILIKE :q OR coalesce(p.bio, '') ILIKE :q"
                    + " OR EXISTS (SELECT 1 FROM service s WHERE s.professional_id = p.id AND s.active AND s.name ILIKE :q))");
            params.put("q", "%" + in.q().trim() + "%");
        }
        if (geo && in.radiusKm() != null) {
            // quem ainda não informou localização continua aparecendo (no fim da lista)
            sql.append(" AND (p.location IS NULL OR ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius))");
            params.put("radius", in.radiusKm() * 1000);
        }
        sql.append(" ORDER BY distance_km NULLS LAST, p.studio LIMIT :limit");
        params.put("limit", Math.min(Math.max(in.limit(), 1), 100));

        return jdbc.sql(sql.toString()).params(params).query((rs, i) -> new ProfessionalCard(
                rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("studio"), rs.getString("handle"),
                Niche.valueOf(rs.getString("niche")), rs.getString("bio"),
                media.publicUrl(rs.getString("photo_key")), media.publicUrl(rs.getString("cover_key")),
                rs.getString("neighborhood"), rs.getString("city"),
                round(rs.getObject("distance_km", Double.class)), rs.getObject("min_price", Long.class), rs.getInt("services_count"),
                rs.getObject("rating") == null ? null : Math.round(rs.getDouble("rating") * 10) / 10.0, rs.getInt("reviews"))).list();
    }

    @Transactional(readOnly = true)
    PublicPage page(UUID professionalId) {
        boolean visible = jdbc.sql("""
                SELECT p.account_id FROM professional p JOIN account a ON a.id = p.account_id
                 WHERE p.id = :id AND p.deleted_at IS NULL AND a.suspended_at IS NULL""").param("id", professionalId)
                .query(UUID.class).optional().filter(acc -> !moderation.blockedBetween(CurrentAccount.id(), acc)).isPresent();
        var pro = profiles.publicProfessional(professionalId).filter(x -> visible)
                .orElseThrow(() -> ApiException.notFound("PROFESSIONAL_NOT_FOUND", "Profissional não encontrada."));
        return new PublicPage(pro, catalog.activeServices(professionalId), catalog.designs(professionalId), page.widgets(professionalId),
                scheduling.workHours(professionalId), reviews.summary(professionalId), reviews.recent(professionalId, 10));
    }

    @Transactional(readOnly = true)
    List<TrendingDesign> trending(Niche niche, Double lat, Double lng, int limit) {
        Map<String, Object> params = new HashMap<>();
        boolean geo = lat != null && lng != null;
        String distance = geo ? "ST_Distance(p.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000.0" : "NULL::double precision";
        StringBuilder sql = new StringBuilder("""
                SELECT d.id, d.professional_id, p.studio, p.photo_key, d.service_id, s.name AS service_name, d.name, d.image_key,
                       d.price_delta_cents, %s AS distance_km
                  FROM design d
                  JOIN service s ON s.id = d.service_id AND s.active
                  JOIN professional p ON p.id = d.professional_id
                 WHERE p.deleted_at IS NULL
                   AND NOT EXISTS (SELECT 1 FROM account a WHERE a.id = p.account_id AND a.suspended_at IS NOT NULL)
                """.formatted(distance));
        excludeBlocked(sql, params);
        if (geo) {
            params.put("lat", lat);
            params.put("lng", lng);
        }
        if (niche != null) {
            sql.append(" AND s.niche = :niche");
            params.put("niche", niche.name());
        }
        sql.append(geo ? " ORDER BY distance_km NULLS LAST, d.created_at DESC" : " ORDER BY d.created_at DESC");
        sql.append(" LIMIT :limit");
        params.put("limit", Math.min(Math.max(limit, 1), 50));
        return jdbc.sql(sql.toString()).params(params).query((rs, i) -> new TrendingDesign(
                rs.getObject("id", UUID.class), rs.getObject("professional_id", UUID.class), rs.getString("studio"),
                media.publicUrl(rs.getString("photo_key")), rs.getObject("service_id", UUID.class), rs.getString("service_name"),
                rs.getString("name"), media.publicUrl(rs.getString("image_key")), rs.getLong("price_delta_cents"),
                round(rs.getObject("distance_km", Double.class)))).list();
    }

    /** Quem eu bloqueei ou me bloqueou não aparece na busca nem na vitrine. */
    private void excludeBlocked(StringBuilder sql, Map<String, Object> params) {
        var blocked = moderation.blockedWith(CurrentAccount.id());
        if (blocked.isEmpty()) return;
        sql.append(" AND p.account_id NOT IN (:blocked)");
        params.put("blocked", blocked);
    }

    private static Double round(Double km) {
        return km == null ? null : Math.round(km * 10) / 10.0;
    }
}
