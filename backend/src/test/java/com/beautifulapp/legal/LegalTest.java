package com.beautifulapp.legal;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.beautifulapp.ApiTestSupport;

class LegalTest extends ApiTestSupport {
    @Autowired LegalApi legal;

    @Test
    void publicPagesForTheStores() throws Exception {
        String html = send("GET", "/legal/privacidade", null, null, 200);
        assertThat(html).contains("<h1>Política de Privacidade</h1>").contains("LGPD").contains("<table>")
                .doesNotContain("{{").contains("href=\"/legal/termos\"");
        assertThat(send("GET", "/legal/termos", null, null, 200)).contains("<h1>Termos de Uso</h1>").contains("18 anos");
        send("GET", "/legal/nada", null, null, 404);
        assertThat(read(send("GET", "/legal", null, null, 200), "$.version")).isEqualTo(legal.version());
    }

    @Test
    void acceptanceAndImageConsent() throws Exception {
        String token = read(login(newPhone()), "$.accessToken");
        assertThat(read(getJson("/me", token), "$.legal.accepted")).isEqualTo("false");

        postJson("/me/onboarding", json("{'role':'CLIENT','name':'Ana','acceptedTerms':true,'imageConsent':true}"), token, 200);
        String me = getJson("/me", token);
        assertThat(read(me, "$.legal.accepted")).isEqualTo("true");
        assertThat(read(me, "$.legal.version")).isEqualTo(legal.version());
        assertThat(read(me, "$.legal.imageConsent")).isEqualTo("true");

        me = postJson("/me/consents", json("{'kind':'IMAGE_USE','granted':false}"), token, 200);
        assertThat(read(me, "$.legal.imageConsent")).isEqualTo("false");
        me = postJson("/me/consents", json("{'kind':'IMAGE_USE','granted':true}"), token, 200);
        assertThat(read(me, "$.legal.imageConsent")).isEqualTo("true");

        assertThat(read(postJson("/me/consents", json("{'kind':'TERMS','granted':false}"), token, 400), "$.code")).isEqualTo("TERMS_REQUIRED");
    }

    @Test
    void accountWithoutAcceptanceCanAcceptCurrentVersion() throws Exception {
        String token = read(login(newPhone()), "$.accessToken");
        String me = postJson("/me/consents", json("{'kind':'TERMS','granted':true}"), token, 200);
        assertThat(read(me, "$.legal.accepted")).isEqualTo("true");
    }
}
