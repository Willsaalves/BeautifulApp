package com.beautifulapp.scheduling.adapter.out.modules;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.beautifulapp.identity.IdentityApi;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.scheduling.application.port.out.Participants;

/** Porta Participants sobre o módulo profile. */
@Component
class ProfileAdapter implements Participants {
    private final ProfileApi profiles;
    private final IdentityApi identity;

    ProfileAdapter(ProfileApi profiles, IdentityApi identity) {
        this.profiles = profiles;
        this.identity = identity;
    }

    @Override
    public boolean hasClientProfile(UUID accountId) {
        return profiles.clientSummary(accountId).filter(c -> c.name() != null).isPresent();
    }

    @Override
    public Optional<ProfessionalTerms> professional(UUID professionalId) {
        return profiles.publicProfessional(professionalId).map(p -> {
            UUID account = profiles.accountOfProfessional(professionalId).orElse(null);
            boolean active = account != null && identity.find(account).filter(a -> !a.suspended() && a.deletedAt() == null).isPresent();
            return new ProfessionalTerms(p.id(), account, p.depositDeadlineHours(), p.studio(), p.photoUrl(), p.neighborhood(), p.city(), p.pixKey(), active);
        });
    }

    @Override
    public Optional<UUID> professionalIdOf(UUID accountId) { return profiles.professionalIdOf(accountId); }

    @Override
    public Optional<ClientCard> client(UUID accountId) {
        return profiles.clientSummary(accountId).map(c -> new ClientCard(c.accountId(), c.name(), c.photoUrl(), c.phone()));
    }
}
