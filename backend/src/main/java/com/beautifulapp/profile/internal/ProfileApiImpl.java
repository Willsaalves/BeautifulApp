package com.beautifulapp.profile.internal;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.identity.IdentityApi;
import com.beautifulapp.media.MediaApi;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.profile.PublicProfessional;

@Service
class ProfileApiImpl implements ProfileApi {
    private final ProfessionalRepository professionals;
    private final ClientProfileRepository clients;
    private final IdentityApi identity;
    private final MediaApi media;

    ProfileApiImpl(ProfessionalRepository professionals, ClientProfileRepository clients, IdentityApi identity, MediaApi media) {
        this.professionals = professionals;
        this.clients = clients;
        this.identity = identity;
        this.media = media;
    }

    @Override
    @Transactional(readOnly = true)
    public UUID requireProfessionalId(UUID accountId) {
        return professionals.findByAccountId(accountId).map(p -> p.id)
                .orElseThrow(() -> ApiException.forbidden("NOT_PROFESSIONAL", "Disponível só para contas de profissional."));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ClientSummary> clientSummary(UUID accountId) {
        String phone = identity.find(accountId).map(a -> a.phone()).orElse(null);
        return clients.findById(accountId)
                .map(c -> new ClientSummary(accountId, c.name, media.publicUrl(c.photoKey), phone))
                .or(() -> phone == null ? Optional.empty() : Optional.of(new ClientSummary(accountId, "Cliente", null, phone)));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PublicProfessional> publicProfessional(UUID id) {
        return professionals.findById(id).map(p -> new PublicProfessional(p.id, p.name, p.studio, p.handle, p.niche, p.bio,
                media.publicUrl(p.photoKey), media.publicUrl(p.coverKey), p.neighborhood, p.city, p.latitude, p.longitude,
                p.pixKey, p.depositDeadlineHours));
    }
}
