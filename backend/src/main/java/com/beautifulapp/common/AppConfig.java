package com.beautifulapp.common;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class AppConfig {
    /** Relógio injetável: os testes controlam o tempo (expiração de OTP, prazo do sinal…). */
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
