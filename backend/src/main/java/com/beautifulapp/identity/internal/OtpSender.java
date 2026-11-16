package com.beautifulapp.identity.internal;

/** Canal de entrega do código. Produção: WhatsApp Cloud API / Twilio Verify / SNS. */
interface OtpSender {
    void send(String phone, String code);
}
