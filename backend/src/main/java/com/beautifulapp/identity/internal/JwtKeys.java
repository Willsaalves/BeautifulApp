package com.beautifulapp.identity.internal;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.beautifulapp.identity.IdentityProperties;

/** Par RSA para assinar (RS256) os tokens. Em produção vem do Secrets Manager via variáveis de ambiente. */
@Component
class JwtKeys {
    private static final Logger log = LoggerFactory.getLogger(JwtKeys.class);

    final RSAPublicKey publicKey;
    final RSAPrivateKey privateKey;
    final String keyId;

    JwtKeys(IdentityProperties props) throws Exception {
        var jwt = props.jwt();
        if (StringUtils.hasText(jwt.privateKey()) && StringUtils.hasText(jwt.publicKey())) {
            KeyFactory kf = KeyFactory.getInstance("RSA");
            privateKey = (RSAPrivateKey) kf.generatePrivate(new PKCS8EncodedKeySpec(pem(jwt.privateKey())));
            publicKey = (RSAPublicKey) kf.generatePublic(new X509EncodedKeySpec(pem(jwt.publicKey())));
        } else {
            log.warn("app.identity.jwt.private-key não configurada: gerando par RSA temporário (tokens invalidam ao reiniciar).");
            KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
            gen.initialize(2048);
            KeyPair kp = gen.generateKeyPair();
            privateKey = (RSAPrivateKey) kp.getPrivate();
            publicKey = (RSAPublicKey) kp.getPublic();
        }
        keyId = Hashing.sha256(Base64.getEncoder().encodeToString(publicKey.getEncoded())).substring(0, 16);
    }

    private static byte[] pem(String value) {
        String body = value.replaceAll("-----(BEGIN|END) [A-Z ]+-----", "").replaceAll("\\s", "");
        return Base64.getDecoder().decode(body);
    }
}
