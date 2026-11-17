package com.beautifulapp.profile.internal;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.Ids;
import com.beautifulapp.identity.AccountView;
import com.beautifulapp.identity.IdentityApi;
import com.beautifulapp.legal.LegalApi;
import com.beautifulapp.identity.Role;
import com.beautifulapp.media.MediaApi;
import com.beautifulapp.media.MediaKind;
import com.beautifulapp.profile.internal.ProfileDtos.*;

@Service
class ProfileService {
    private final IdentityApi identity;
    private final MediaApi media;
    private final ClientProfileRepository clients;
    private final ProfessionalRepository professionals;
    private final FavoriteRepository favorites;
    private final Clock clock;
    private final LegalApi legal;

    ProfileService(IdentityApi identity, MediaApi media, ClientProfileRepository clients, ProfessionalRepository professionals,
                   FavoriteRepository favorites, Clock clock, LegalApi legal) {
        this.identity = identity;
        this.media = media;
        this.clients = clients;
        this.professionals = professionals;
        this.favorites = favorites;
        this.clock = clock;
        this.legal = legal;
    }

    @Transactional(readOnly = true)
    Me me(UUID accountId) {
        AccountView acc = identity.find(accountId)
                .orElseThrow(() -> ApiException.unauthorized("ACCOUNT_NOT_FOUND", "Conta não encontrada."));
        ClientDto client = clients.findById(accountId).map(this::dto).orElse(null);
        ProfessionalDto pro = professionals.findByAccountId(accountId).map(this::dto).orElse(null);
        List<UUID> favs = favorites.findByClientAccountIdOrderByCreatedAtDesc(accountId).stream().map(Favorite::professionalId).toList();
        String version = legal.version();
        boolean accepted = identity.hasConsent(accountId, "terms", version) && identity.hasConsent(accountId, "privacy", version);
        return new Me(acc.id(), acc.phone(), acc.email(), acc.roles(), client, pro, favs,
                new LegalStatus(version, accepted, identity.hasConsent(accountId, "image_use", null)));
    }

    @Transactional
    Me onboard(UUID accountId, Onboarding in) {
        if (in.role() == Role.ADMIN) throw ApiException.badRequest("ROLE_INVALID", "Escolha cliente ou profissional.");
        in = new Onboarding(in.role(), in.name(), in.email(), in.bio(), media.normalizeKey(in.photoKey()), media.normalizeKey(in.coverKey()),
                in.studio(), in.niche(), in.neighborhood(), in.city(), in.pixKey(), in.latitude(), in.longitude(), in.acceptedTerms(), in.imageConsent());
        media.assertOwned(in.photoKey(), accountId, MediaKind.AVATAR);
        media.assertOwned(in.coverKey(), accountId, MediaKind.COVER);
        Instant now = clock.instant();
        String name = in.name().trim();

        if (in.role() == Role.CLIENT) {
            if (clients.existsById(accountId)) throw ApiException.conflict("PROFILE_EXISTS", "Você já tem perfil de cliente.");
            ClientProfile c = new ClientProfile(accountId, name, Handles.from(name, clients::existsByHandle), now);
            c.bio = blankToNull(in.bio());
            c.photoKey = in.photoKey();
            c.coverKey = in.coverKey();
            clients.save(c);
        } else {
            if (professionals.findByAccountId(accountId).isPresent()) {
                throw ApiException.conflict("PROFILE_EXISTS", "Você já tem perfil de profissional.");
            }
            if (!StringUtils.hasText(in.studio()) || in.niche() == null || !StringUtils.hasText(in.neighborhood())) {
                throw ApiException.badRequest("PROFESSIONAL_FIELDS", "Informe nome do estúdio, especialidade e bairro.");
            }
            String studio = in.studio().trim();
            Professional p = new Professional(Ids.newId(), accountId, name, studio,
                    Handles.from(studio, professionals::existsByHandle), in.niche(), in.neighborhood().trim(),
                    StringUtils.hasText(in.city()) ? in.city().trim() : "São Paulo", now);
            p.bio = blankToNull(in.bio());
            p.photoKey = in.photoKey();
            p.coverKey = in.coverKey();
            p.pixKey = blankToNull(in.pixKey());
            setLocation(p, in.latitude(), in.longitude());
            professionals.save(p);
        }

        identity.grantRole(accountId, in.role());
        if (StringUtils.hasText(in.email())) identity.updateEmail(accountId, in.email().trim());
        identity.recordConsent(accountId, "terms", legal.version());
        identity.recordConsent(accountId, "privacy", legal.version());
        if (Boolean.TRUE.equals(in.imageConsent())) identity.recordConsent(accountId, "image_use", legal.version());
        return me(accountId);
    }

    @Transactional
    Me consent(UUID accountId, ConsentInput in) {
        String version = legal.version();
        if (in.kind() == ConsentKind.TERMS) {
            if (!in.granted()) {
                throw ApiException.badRequest("TERMS_REQUIRED", "Para usar o app é preciso aceitar os Termos. Se preferir, exclua sua conta.");
            }
            identity.recordConsent(accountId, "terms", version);
            identity.recordConsent(accountId, "privacy", version);
        } else if (in.granted()) {
            identity.recordConsent(accountId, "image_use", version);
        } else {
            identity.revokeConsent(accountId, "image_use");
        }
        return me(accountId);
    }

    @Transactional
    Me patchClient(UUID accountId, ClientPatch in) {
        // Profissional que trocou para a área da cliente ainda não tem perfil de cliente: cria na hora.
        String requestedName = in.name();
        ClientProfile c = clients.findById(accountId).orElseGet(() -> createClientFor(accountId, requestedName));
        in = new ClientPatch(in.name(), in.bio(), media.normalizeKey(in.photoKey()), media.normalizeKey(in.coverKey()), in.email());
        media.assertOwned(in.photoKey(), accountId, MediaKind.AVATAR);
        media.assertOwned(in.coverKey(), accountId, MediaKind.COVER);
        if (in.name() != null) c.name = in.name().trim();
        if (in.bio() != null) c.bio = blankToNull(in.bio());
        if (in.photoKey() != null) c.photoKey = in.photoKey();
        if (in.coverKey() != null) c.coverKey = in.coverKey();
        if (in.email() != null) identity.updateEmail(accountId, blankToNull(in.email()));
        c.updatedAt = clock.instant();
        return me(accountId);
    }

    private ClientProfile createClientFor(UUID accountId, String requestedName) {
        String name = StringUtils.hasText(requestedName) ? requestedName.trim()
                : professionals.findByAccountId(accountId).map(p -> p.name)
                        .orElseThrow(() -> ApiException.notFound("PROFILE_NOT_FOUND", "Perfil de cliente não encontrado."));
        ClientProfile c = clients.save(new ClientProfile(accountId, name, Handles.from(name, clients::existsByHandle), clock.instant()));
        identity.grantRole(accountId, Role.CLIENT);
        return c;
    }

    @Transactional
    Me patchProfessional(UUID accountId, ProfessionalPatch in) {
        Professional p = professionals.findByAccountId(accountId)
                .orElseThrow(() -> ApiException.notFound("PROFILE_NOT_FOUND", "Perfil de profissional não encontrado."));
        in = new ProfessionalPatch(in.name(), in.studio(), in.bio(), media.normalizeKey(in.photoKey()), media.normalizeKey(in.coverKey()),
                in.neighborhood(), in.city(), in.pixKey(), in.depositDeadlineHours(), in.email(), in.latitude(), in.longitude());
        media.assertOwned(in.photoKey(), accountId, MediaKind.AVATAR);
        media.assertOwned(in.coverKey(), accountId, MediaKind.COVER);
        if (in.name() != null) p.name = in.name().trim();
        if (in.studio() != null) p.studio = in.studio().trim();
        if (in.bio() != null) p.bio = blankToNull(in.bio());
        if (in.photoKey() != null) p.photoKey = in.photoKey();
        if (in.coverKey() != null) p.coverKey = in.coverKey();
        if (in.neighborhood() != null) p.neighborhood = in.neighborhood().trim();
        if (in.city() != null) p.city = in.city().trim();
        if (in.pixKey() != null) p.pixKey = blankToNull(in.pixKey());
        if (in.depositDeadlineHours() != null) p.depositDeadlineHours = in.depositDeadlineHours();
        if (in.latitude() != null || in.longitude() != null) setLocation(p, in.latitude(), in.longitude());
        if (in.email() != null) identity.updateEmail(accountId, blankToNull(in.email()));
        p.updatedAt = clock.instant();
        return me(accountId);
    }

    private ClientDto dto(ClientProfile c) {
        return new ClientDto(c.name, c.handle, c.bio, c.photoKey, media.publicUrl(c.photoKey), c.coverKey, media.publicUrl(c.coverKey));
    }

    private ProfessionalDto dto(Professional p) {
        return new ProfessionalDto(p.id, p.name, p.studio, p.handle, p.niche, p.bio, p.photoKey, media.publicUrl(p.photoKey),
                p.coverKey, media.publicUrl(p.coverKey), p.neighborhood, p.city, p.latitude, p.longitude, p.pixKey, p.depositDeadlineHours);
    }

    private static void setLocation(Professional p, Double lat, Double lng) {
        if ((lat == null) != (lng == null)) throw ApiException.badRequest("LOCATION_INCOMPLETE", "Envie latitude e longitude juntas.");
        p.latitude = lat;
        p.longitude = lng;
    }

    private static String blankToNull(String s) {
        return StringUtils.hasText(s) ? s.trim() : null;
    }
}
