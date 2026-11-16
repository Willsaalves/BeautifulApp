package com.beautifulapp.identity;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.identity")
public record IdentityProperties(Jwt jwt, Otp otp) {

    /** privateKey/publicKey em PEM. Vazios: gera um par temporário (apenas dev/teste). */
    public record Jwt(String issuer, Duration accessTtl, Duration refreshTtl, String privateKey, String publicKey) {}

    /** fixedCode: se preenchido, todo OTP é esse código (ambiente de testes, sem custo de SMS). */
    public record Otp(String fixedCode, Duration ttl, int maxAttempts, int maxRequestsPerHour, String pepper) {}
}
