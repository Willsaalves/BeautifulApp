package com.beautifulapp.identity.internal;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.Ids;
import com.beautifulapp.identity.IdentityProperties;

@Service
class OtpService {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpChallengeRepository challenges;
    private final OtpSender sender;
    private final IdentityProperties.Otp props;
    private final Clock clock;

    OtpService(OtpChallengeRepository challenges, OtpSender sender, IdentityProperties props, Clock clock) {
        this.challenges = challenges;
        this.sender = sender;
        this.props = props.otp();
        this.clock = clock;
    }

    @Transactional
    Duration request(String phone) {
        Instant now = clock.instant();
        if (challenges.countByPhoneAndCreatedAtAfter(phone, now.minus(Duration.ofHours(1))) >= props.maxRequestsPerHour()) {
            throw ApiException.tooMany("OTP_RATE_LIMIT", "Muitos códigos pedidos. Tente de novo em alguns minutos.");
        }
        String code = StringUtils.hasText(props.fixedCode()) ? props.fixedCode() : "%06d".formatted(RANDOM.nextInt(1_000_000));
        challenges.save(new OtpChallenge(Ids.newId(), phone, hash(phone, code), now, now.plus(props.ttl())));
        sender.send(phone, code);
        return props.ttl();
    }

    /** Valida o código; em caso de erro incrementa tentativas (o commit acontece mesmo lançando a exceção). */
    @Transactional(noRollbackFor = ApiException.class)
    void verify(String phone, String code) {
        Instant now = clock.instant();
        OtpChallenge c = challenges.findFirstByPhoneAndConsumedAtIsNullOrderByCreatedAtDesc(phone)
                .filter(x -> x.expiresAt().isAfter(now))
                .orElseThrow(() -> ApiException.badRequest("OTP_EXPIRED", "Código expirado. Peça um novo."));
        if (c.attempts() >= props.maxAttempts()) {
            throw ApiException.tooMany("OTP_TOO_MANY_ATTEMPTS", "Muitas tentativas. Peça um novo código.");
        }
        if (code == null || !Hashing.constantTimeEquals(c.codeHash(), hash(phone, code))) {
            c.failedAttempt();
            throw ApiException.badRequest("OTP_INVALID", "Código incorreto. Confira e tente de novo.");
        }
        c.consume(now);
    }

    private String hash(String phone, String code) {
        return Hashing.sha256(props.pepper() + ":" + phone + ":" + code);
    }
}
