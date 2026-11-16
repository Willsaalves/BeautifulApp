package com.beautifulapp.identity;

import java.util.Optional;
import java.util.UUID;

/** O que outros módulos podem pedir ao módulo de identidade. */
public interface IdentityApi {
    Optional<AccountView> find(UUID accountId);

    void grantRole(UUID accountId, Role role);

    void updateEmail(UUID accountId, String email);

    /** Registra aceite (ex: "terms", "privacy", "image_use") com a versão do texto aceito. */
    void recordConsent(UUID accountId, String kind, String version);

    /** Aceite em vigor (não revogado) deste tipo; com versão, só conta se for a mesma versão. */
    boolean hasConsent(UUID accountId, String kind, String versionOrNull);

    /** Revoga o aceite deste tipo (ex: "image_use"). */
    void revokeConsent(UUID accountId, String kind);
}
