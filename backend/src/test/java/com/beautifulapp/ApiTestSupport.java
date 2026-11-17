package com.beautifulapp;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest(properties = {"app.scheduling.jobs=false", "app.identity.admin-phones=11900000099"})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
public abstract class ApiTestSupport {
    private static final AtomicInteger SEQ = new AtomicInteger(10_000_000);

    @Autowired protected MockMvc mvc;
    @Autowired protected TestcontainersConfig.MutableClock clock;

    /** Celular único por teste: (11) 9XXXX-XXXX. */
    protected static String newPhone() {
        return "119" + SEQ.incrementAndGet();
    }

    protected static String json(String template, Object... args) {
        return template.formatted(args).replace('\'', '"');
    }

    protected String postJson(String url, String body, String token, int expectedStatus) throws Exception {
        var req = post(url).contentType(MediaType.APPLICATION_JSON).content(body);
        if (token != null) req.header("Authorization", "Bearer " + token);
        var res = mvc.perform(req).andReturn().getResponse();
        String resBody = res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        org.assertj.core.api.Assertions.assertThat(res.getStatus()).as("%s %s -> %s", url, resBody, res.getStatus()).isEqualTo(expectedStatus);
        return resBody;
    }

    /** Pede e confirma o OTP (código fixo 123456 no perfil de teste). Devolve o corpo da sessão. */
    protected String login(String phone) throws Exception {
        postJson("/auth/otp/request", json("{'phone':'%s'}", phone), null, 202);
        return postJson("/auth/otp/verify", json("{'phone':'%s','code':'123456'}", phone), null, 200);
    }

    protected String send(String method, String url, String body, String token, int expectedStatus) throws Exception {
        var req = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(org.springframework.http.HttpMethod.valueOf(method), url);
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(body);
        if (token != null) req.header("Authorization", "Bearer " + token);
        var res = mvc.perform(req).andReturn().getResponse();
        String resBody = res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        org.assertj.core.api.Assertions.assertThat(res.getStatus()).as("%s %s %s -> %s", method, url, resBody, res.getStatus()).isEqualTo(expectedStatus);
        return resBody;
    }

    protected String getJson(String url, String token) throws Exception {
        return send("GET", url, null, token, 200);
    }

    /** Cria conta de profissional (opcionalmente com localização) e devolve o token. */
    protected String newProfessional(String studio, String niche, Double lat, Double lng) throws Exception {
        String token = read(login(newPhone()), "$.accessToken");
        String loc = lat == null ? "" : ",'latitude':%s,'longitude':%s".formatted(lat, lng);
        postJson("/me/onboarding", json("{'role':'PROFESSIONAL','name':'Pro %s','studio':'%s','niche':'%s','neighborhood':'Pinheiros','acceptedTerms':true%s}",
                studio, studio, niche, loc), token, 200);
        return token;
    }

    protected String newClient() throws Exception {
        String token = read(login(newPhone()), "$.accessToken");
        postJson("/me/onboarding", json("{'role':'CLIENT','name':'Cliente','acceptedTerms':true}"), token, 200);
        return token;
    }

    protected String upload(String token, String kind) throws Exception {
        return read(postJson("/media/upload-url", json("{'kind':'%s','contentType':'image/jpeg','sizeBytes':1000}", kind), token, 200), "$.key");
    }

    protected static String read(String body, String path) {
        Object v = JsonPath.read(body, path);
        return v == null ? null : v.toString();
    }
}
