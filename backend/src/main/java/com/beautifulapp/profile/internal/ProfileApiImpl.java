package com.beautifulapp.profile.internal;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.media.MediaApi;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.profile.PublicProfessional;

@Service
class ProfileApiImpl implements ProfileApi {
    private final ProfessionalRepository professionals;
    private final MediaApi media;

    ProfileApiImpl(ProfessionalRepository professionals, MediaApi media) {
        this.professionals = professionals;
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
    public Optional<PublicProfessional> publicProfessional(UUID id) {
        return professionals.findById(id).map(p -> new PublicProfessional(p.id, p.name, p.studio, p.handle, p.niche, p.bio,
                media.publicUrl(p.photoKey), media.publicUrl(p.coverKey), p.neighborhood, p.city, p.latitude, p.longitude,
                p.pixKey, p.depositDeadlineHours));
    }
}
