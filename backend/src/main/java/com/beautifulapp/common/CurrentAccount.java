package com.beautifulapp.common;

import java.util.UUID;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/** Id da conta logada, lido do "sub" do JWT. */
public final class CurrentAccount {
    private CurrentAccount() {}

    public static UUID id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) return UUID.fromString(jwt.getSubject());
        throw ApiException.unauthorized("UNAUTHENTICATED", "Faça login para continuar.");
    }
}
