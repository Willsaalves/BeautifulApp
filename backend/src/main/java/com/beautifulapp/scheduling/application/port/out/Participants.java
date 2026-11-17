package com.beautifulapp.scheduling.application.port.out;

import java.util.Optional;
import java.util.UUID;

/** Quem participa do agendamento (implementado sobre o módulo profile). */
public interface Participants {
    boolean hasClientProfile(UUID accountId);

    Optional<ProfessionalTerms> professional(UUID professionalId);

    Optional<UUID> professionalIdOf(UUID accountId);

    Optional<ClientCard> client(UUID accountId);

    /** Regras da profissional que o agendamento usa. */
    /** active=false: conta suspensa pela moderação (não recebe agendamentos novos). */
    record ProfessionalTerms(UUID professionalId, UUID accountId, int depositDeadlineHours, String studio, String photoUrl,
                             String neighborhood, String city, String pixKey, boolean active) {}

    record ClientCard(UUID accountId, String name, String photoUrl, String phone) {}
}
