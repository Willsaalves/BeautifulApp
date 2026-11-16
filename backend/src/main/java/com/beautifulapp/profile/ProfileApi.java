package com.beautifulapp.profile;

import java.util.Optional;
import java.util.UUID;

public interface ProfileApi {
    /** Id da profissional da conta logada; 403 se a conta não tem perfil de profissional. */
    UUID requireProfessionalId(UUID accountId);

    Optional<PublicProfessional> publicProfessional(UUID professionalId);

    /** Conta (login) da profissional, para notificar e checar participação no chat. */
    Optional<UUID> accountOfProfessional(UUID professionalId);

    /** Id da profissional ligada a esta conta, se houver. */
    Optional<UUID> professionalIdOf(UUID accountId);

    /** Nome, foto e celular da cliente (para a agenda da profissional). */
    Optional<ClientSummary> clientSummary(UUID accountId);

    record ClientSummary(UUID accountId, String name, String photoUrl, String phone) {}
}
