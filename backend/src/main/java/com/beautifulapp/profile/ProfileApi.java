package com.beautifulapp.profile;

import java.util.Optional;
import java.util.UUID;

public interface ProfileApi {
    /** Id da profissional da conta logada; 403 se a conta não tem perfil de profissional. */
    UUID requireProfessionalId(UUID accountId);

    Optional<PublicProfessional> publicProfessional(UUID professionalId);
}
