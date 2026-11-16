package com.beautifulapp.media.internal;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import com.beautifulapp.media.MediaProperties;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
class S3Config {
    @Bean(destroyMethod = "close")
    S3Presigner s3Presigner(MediaProperties p) {
        var b = S3Presigner.builder().region(Region.of(p.region()));
        if (StringUtils.hasText(p.accessKey())) {
            b.credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(p.accessKey(), p.secretKey())));
        } else {
            b.credentialsProvider(DefaultCredentialsProvider.builder().build());
        }
        if (p.endpoint() != null) {
            b.endpointOverride(p.endpoint())
                    .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());
        }
        return b.build();
    }
}
