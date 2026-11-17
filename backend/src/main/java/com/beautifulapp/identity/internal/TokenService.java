package com.beautifulapp.identity.internal;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.Ids;
import com.beautifulapp.identity.IdentityProperties;

@Service
class TokenService {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JwtEncoder encoder;
    private final RefreshTokenRepository refreshTokens;
    private final IdentityProperties.Jwt props;
    private final Clock clock;

    TokenService(JwtEncoder encoder, RefreshTokenRepository refreshTokens, IdentityProperties props, Clock clock) {
        this.encoder = encoder;
        this.refreshTokens = refreshTokens;
        this.props = props.jwt();
        this.clock = clock;
    }

    record Tokens(String accessToken, String refreshToken, long expiresIn) {}

    @Transactional
    Tokens issue(Account account) {
        return issue(account.id(), account.phone(), Ids.newId());
    }

    /** Troca o refresh token por um novo par. Reuso de um token já trocado revoga a sessão inteira. */
    @Transactional(noRollbackFor = ApiException.class)
    Tokens refresh(String rawToken, AccountRepository accounts) {
        Instant now = clock.instant();
        RefreshToken current = refreshTokens.findByTokenHash(Hashing.sha256(rawToken))
                .orElseThrow(TokenService::invalid);
        if (current.revoked()) {
            refreshTokens.revokeFamily(current.familyId(), now);
            throw invalid();
        }
        if (!current.expiresAt().isAfter(now)) throw invalid();
        current.revoke(now);
        Account account = accounts.findById(current.accountId()).filter(a -> !a.deleted() && !a.suspended()).orElseThrow(TokenService::invalid);
        return issue(account.id(), account.phone(), current.familyId());
    }

    @Transactional
    void revoke(String rawToken) {
        refreshTokens.findByTokenHash(Hashing.sha256(rawToken)).ifPresent(t -> refreshTokens.revokeFamily(t.familyId(), clock.instant()));
    }

    private Tokens issue(UUID accountId, String phone, UUID family) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(props.issuer())
                .subject(accountId.toString())
                .issuedAt(now)
                .expiresAt(now.plus(props.accessTtl()))
                .claim("phone", phone)
                .build();
        String access = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims)).getTokenValue();

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshToken(Ids.newId(), accountId, Hashing.sha256(refresh), family, now, now.plus(props.refreshTtl())));
        return new Tokens(access, refresh, props.accessTtl().toSeconds());
    }

    private static ApiException invalid() {
        return ApiException.unauthorized("REFRESH_INVALID", "Sessão expirada. Entre novamente.");
    }
}
