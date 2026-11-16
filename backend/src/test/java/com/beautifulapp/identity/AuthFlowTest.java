package com.beautifulapp.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import com.beautifulapp.ApiTestSupport;

class AuthFlowTest extends ApiTestSupport {

    @AfterEach
    void resetClock() { clock.reset(); }

    @Test
    void newPhoneLogsInAsNewAccount() throws Exception {
        String session = login(newPhone());
        assertThat(read(session, "$.isNew")).isEqualTo("true");
        assertThat(read(session, "$.accessToken")).isNotBlank();
        assertThat(read(session, "$.refreshToken")).isNotBlank();

        mvc.perform(get("/me").header("Authorization", "Bearer " + read(session, "$.accessToken")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value(org.hamcrest.Matchers.startsWith("+5511")))
                .andExpect(jsonPath("$.roles").isEmpty());
    }

    @Test
    void returningUserIsNotNew() throws Exception {
        String phone = newPhone();
        String token = read(login(phone), "$.accessToken");
        postJson("/me/onboarding", json("{'role':'CLIENT','name':'Bruna','acceptedTerms':true}"), token, 200);
        String again = login(phone);
        assertThat(read(again, "$.isNew")).isEqualTo("false");
        assertThat(read(again, "$.roles[0]")).isEqualTo("CLIENT");
    }

    @Test
    void acceptsMaskedPhone() throws Exception {
        String digits = newPhone();
        String masked = "(%s) %s-%s".formatted(digits.substring(0, 2), digits.substring(2, 7), digits.substring(7));
        String body = postJson("/auth/otp/request", json("{'phone':'%s'}", masked), null, 202);
        assertThat(read(body, "$.phone")).isEqualTo("+55" + digits);
    }

    @Test
    void rejectsInvalidPhone() throws Exception {
        String body = postJson("/auth/otp/request", json("{'phone':'1234'}"), null, 400);
        assertThat(read(body, "$.code")).isEqualTo("PHONE_INVALID");
    }

    @Test
    void wrongCodeCountsAttemptsAndBlocksAfterMax() throws Exception {
        String phone = newPhone();
        postJson("/auth/otp/request", json("{'phone':'%s'}", phone), null, 202);
        for (int i = 0; i < 5; i++) {
            String body = postJson("/auth/otp/verify", json("{'phone':'%s','code':'000000'}", phone), null, 400);
            assertThat(read(body, "$.code")).isEqualTo("OTP_INVALID");
        }
        // depois de 5 erros, até o código certo é recusado
        String body = postJson("/auth/otp/verify", json("{'phone':'%s','code':'123456'}", phone), null, 429);
        assertThat(read(body, "$.code")).isEqualTo("OTP_TOO_MANY_ATTEMPTS");
    }

    @Test
    void codeExpires() throws Exception {
        String phone = newPhone();
        postJson("/auth/otp/request", json("{'phone':'%s'}", phone), null, 202);
        clock.advance(Duration.ofMinutes(6));
        String body = postJson("/auth/otp/verify", json("{'phone':'%s','code':'123456'}", phone), null, 400);
        assertThat(read(body, "$.code")).isEqualTo("OTP_EXPIRED");
    }

    @Test
    void codeCannotBeReused() throws Exception {
        String phone = newPhone();
        login(phone);
        String body = postJson("/auth/otp/verify", json("{'phone':'%s','code':'123456'}", phone), null, 400);
        assertThat(read(body, "$.code")).isEqualTo("OTP_EXPIRED");
    }

    @Test
    void rateLimitsCodeRequests() throws Exception {
        String phone = newPhone();
        for (int i = 0; i < 5; i++) postJson("/auth/otp/request", json("{'phone':'%s'}", phone), null, 202);
        String body = postJson("/auth/otp/request", json("{'phone':'%s'}", phone), null, 429);
        assertThat(read(body, "$.code")).isEqualTo("OTP_RATE_LIMIT");
    }

    @Test
    void refreshRotatesAndReuseRevokesSession() throws Exception {
        String session = login(newPhone());
        String r1 = read(session, "$.refreshToken");

        String rotated = postJson("/auth/refresh", json("{'refreshToken':'%s'}", r1), null, 200);
        String r2 = read(rotated, "$.refreshToken");
        assertThat(r2).isNotEqualTo(r1);

        // reuso do token antigo (possível roubo): derruba a sessão inteira
        postJson("/auth/refresh", json("{'refreshToken':'%s'}", r1), null, 401);
        postJson("/auth/refresh", json("{'refreshToken':'%s'}", r2), null, 401);
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        String session = login(newPhone());
        String r = read(session, "$.refreshToken");
        postJson("/auth/logout", json("{'refreshToken':'%s'}", r), null, 204);
        postJson("/auth/refresh", json("{'refreshToken':'%s'}", r), null, 401);
    }

    @Test
    void protectedEndpointsRequireToken() throws Exception {
        mvc.perform(get("/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/me").header("Authorization", "Bearer invalido")).andExpect(status().isUnauthorized());
    }
}
