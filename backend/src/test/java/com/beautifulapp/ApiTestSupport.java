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

@SpringBootTest
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

    protected static String read(String body, String path) {
        Object v = JsonPath.read(body, path);
        return v == null ? null : v.toString();
    }
}
