package com.beautifulapp.media;

import java.net.URI;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** endpoint vazio = AWS S3 padrão; preenchido = MinIO/R2 (path-style). */
@ConfigurationProperties("app.media")
public record MediaProperties(
        String bucket,
        String region,
        URI endpoint,
        String accessKey,
        String secretKey,
        String publicBaseUrl,
        Duration uploadUrlTtl,
        long maxBytes) {}
