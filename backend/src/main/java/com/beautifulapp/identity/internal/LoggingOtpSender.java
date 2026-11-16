package com.beautifulapp.identity.internal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Dev/testes: só escreve o código no log. Nunca usar em produção. */
@Component
@ConditionalOnProperty(name = "app.identity.otp.sender", havingValue = "log", matchIfMissing = true)
class LoggingOtpSender implements OtpSender {
    private static final Logger log = LoggerFactory.getLogger(LoggingOtpSender.class);

    @Override
    public void send(String phone, String code) {
        log.warn("[OTP DEV] código para {}: {}", phone, code);
    }
}
