package com.beautifulapp.identity;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.identity")
/** adminPhones: celulares com acesso ao painel de administração (APP_ADMIN_PHONES, separados por vírgula). */
public record IdentityProperties(Jwt jwt, Otp otp, List<String> adminPhones) {
    public IdentityProperties {
        adminPhones = adminPhones == null ? List.of() : adminPhones;
    }


    /** privateKey/publicKey em PEM. Vazios: gera um par temporário (apenas dev/teste). */
    public record Jwt(String issuer, Duration accessTtl, Duration refreshTtl, String privateKey, String publicKey) {}

    /** fixedCode: se preenchido, todo OTP é esse código (ambiente de testes, sem custo de SMS). */
    public record Otp(String fixedCode, Duration ttl, int maxAttempts, int maxRequestsPerHour, String pepper) {}
}
