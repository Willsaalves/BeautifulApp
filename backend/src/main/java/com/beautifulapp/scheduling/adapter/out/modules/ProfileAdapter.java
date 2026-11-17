package com.beautifulapp.scheduling.adapter.out.modules;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.scheduling.application.port.out.Participants;

/** Porta Participants sobre o módulo profile. */
@Component
class ProfileAdapter implements Participants {
    private final ProfileApi profiles;

    ProfileAdapter(ProfileApi profiles) { this.profiles = profiles; }

    @Override
    public boolean hasClientProfile(UUID accountId) {
        return profiles.clientSummary(accountId).filter(c -> c.name() != null).isPresent();
    }

    @Override
    public Optional<ProfessionalTerms> professional(UUID professionalId) {
        return profiles.publicProfessional(professionalId).map(p -> new ProfessionalTerms(p.id(),
                profiles.accountOfProfessional(professionalId).orElse(null), p.depositDeadlineHours(), p.studio(), p.photoUrl(),
                p.neighborhood(), p.city(), p.pixKey()));
    }

    @Override
    public Optional<UUID> professionalIdOf(UUID accountId) { return profiles.professionalIdOf(accountId); }

    @Override
    public Optional<ClientCard> client(UUID accountId) {
        return profiles.clientSummary(accountId).map(c -> new ClientCard(c.accountId(), c.name(), c.photoUrl(), c.phone()));
    }
}
