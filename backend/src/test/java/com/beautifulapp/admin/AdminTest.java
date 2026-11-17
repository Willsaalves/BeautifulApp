package com.beautifulapp.admin;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.beautifulapp.ApiTestSupport;
import com.jayway.jsonpath.JsonPath;

class AdminTest extends ApiTestSupport {
    static final String ADMIN_PHONE = "11900000099";

    String admin() throws Exception {
        String session = login(ADMIN_PHONE);
        assertThat(session).contains("ADMIN");
        return read(session, "$.accessToken");
    }

    record Pro(String token, String phone, String id, String serviceId) {}

    Pro pro() throws Exception {
        String phone = newPhone();
        String token = read(login(phone), "$.accessToken");
        String studio = "Adm" + System.nanoTime();
        postJson("/me/onboarding", json("{'role':'PROFESSIONAL','name':'Pro','studio':'%s','niche':'UNHA','neighborhood':'Moema','acceptedTerms':true}", studio), token, 200);
        StringBuilder days = new StringBuilder("[");
        for (int d = 0; d <= 6; d++) days.append(d > 0 ? "," : "").append("{'weekday':%d,'start':'08:00','end':'20:00'}".formatted(d));
        send("PUT", "/me/work-hours", json(days.append("]").toString()), token, 200);
        String svc = postJson("/me/services", json("{'name':'Gel','niche':'UNHA','durationMin':60,'priceCents':10000,'depositPercent':0,'returnIntervalDays':21}"), token, 201);
        return new Pro(token, phone, read(getJson("/me", token), "$.professional.id"), read(svc, "$.id"));
    }

    static String at(int plusDays) {
        LocalDate d = LocalDate.now(ZoneId.of("America/Sao_Paulo")).plusWeeks(2).with(TemporalAdjusters.next(DayOfWeek.MONDAY)).plusDays(plusDays);
        return ZonedDateTime.of(d.getYear(), d.getMonthValue(), d.getDayOfMonth(), 10, 0, 0, 0, ZoneId.of("America/Sao_Paulo")).toInstant().toString();
    }

    String story(Pro p) throws Exception {
        return read(postJson("/stories", json("{'professionalId':'%s','imageKey':'%s','caption':'promo'}", p.id(), upload(p.token(), "STORY")), p.token(), 201), "$.id");
    }

    void report(String type, String id, String token) throws Exception {
        postJson("/reports", json("{'targetType':'%s','targetId':'%s','reason':'INAPPROPRIATE','details':'conteúdo ruim'}", type, id), token, 201);
    }

    @Test
    void onlyAdminsGetIn() throws Exception {
        String client = newClient();
        assertThat(read(send("GET", "/admin/overview", null, client, 403), "$.code")).isEqualTo("ADMIN_ONLY");
        String admin = admin();
        assertThat(read(getJson("/admin/overview", admin), "$.clients")).isNotNull();
        assertThat((List<String>) JsonPath.read(getJson("/me", admin), "$.roles")).contains("ADMIN");
        // ninguém vira ADMIN pelo cadastro
        String other = read(login(newPhone()), "$.accessToken");
        assertThat(read(postJson("/me/onboarding", json("{'role':'ADMIN','name':'Hacker','acceptedTerms':true}"), other, 400), "$.code")).isEqualTo("ROLE_INVALID");
    }

    @Test
    void dismissBringsHiddenStoryBack() throws Exception {
        Pro p = pro();
        String story = story(p);
        for (int i = 0; i < 3; i++) report("STORY", story, newClient()); // 3 denúncias: sai do ar
        String viewer = newClient();
        assertThat((List<String>) JsonPath.read(getJson("/stories?professionalId=" + p.id(), viewer), "$[*].id")).doesNotContain(story);

        String admin = admin();
        String reports = getJson("/admin/reports", admin);
        List<Object> mine = JsonPath.read(reports, "$[?(@.targetId == '" + story + "')]");
        assertThat(mine).hasSize(1);
        assertThat(read(reports, "$[?(@.targetId == '" + story + "')].reporters")).contains("3");
        assertThat(read(reports, "$[?(@.targetId == '" + story + "')].preview.hidden")).contains("true");

        postJson("/admin/reports/STORY/" + story + "/resolve", json("{'decision':'DISMISS','note':'é só uma promoção'}"), admin, 204);
        assertThat((List<String>) JsonPath.read(getJson("/stories?professionalId=" + p.id(), viewer), "$[*].id")).contains(story);
        assertThat((List<Object>) JsonPath.read(getJson("/admin/reports", admin), "$[?(@.targetId == '" + story + "')]")).isEmpty();
        assertThat(getJson("/admin/audit", admin)).contains("REPORT_DISMISSED").contains("é só uma promoção");
    }

    @Test
    void suspendAuthorThenReactivate() throws Exception {
        Pro p = pro();
        String story = story(p);
        String client = newClient();
        report("STORY", story, client);
        String admin = admin();

        postJson("/admin/reports/STORY/" + story + "/resolve", json("{'decision':'SUSPEND_AUTHOR','note':'golpe'}"), admin, 204);

        send("GET", "/me", null, p.token(), 401); // sessão derrubada
        postJson("/auth/otp/request", json("{'phone':'%s'}", p.phone()), null, 202);
        assertThat(read(postJson("/auth/otp/verify", json("{'phone':'%s','code':'123456'}", p.phone()), null, 403), "$.code")).isEqualTo("ACCOUNT_SUSPENDED");
        send("GET", "/professionals/" + p.id(), null, client, 404);
        assertThat(read(postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s'}", p.serviceId(), at(0)), client, 403), "$.code"))
                .isEqualTo("PROFESSIONAL_UNAVAILABLE");
        assertThat((List<String>) JsonPath.read(getJson("/stories?professionalId=" + p.id(), client), "$[*].id")).doesNotContain(story);

        String accountId = read(getJson("/admin/accounts?q=" + p.phone().substring(2), admin), "$[0].accountId");
        String detail = getJson("/admin/accounts/" + accountId, admin);
        assertThat(read(detail, "$.account.suspendedAt")).isNotNull();
        assertThat(read(detail, "$.suspendedReason")).isEqualTo("golpe");
        assertThat(detail).contains("ACCOUNT_SUSPENDED");

        postJson("/admin/accounts/" + accountId + "/reactivate", "{}", admin, 204);
        login(p.phone());
        send("GET", "/professionals/" + p.id(), null, client, 200);
    }

    @Test
    void removeMessageAndGuardAdmins() throws Exception {
        Pro p = pro();
        String client = newClient();
        String ap = read(postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s'}", p.serviceId(), at(1)), client, 201), "$.id");
        String msg = read(postJson("/appointments/" + ap + "/messages", json("{'text':'me paga por fora no pix'}"), p.token(), 201), "$.id");
        report("MESSAGE", msg, client);
        String admin = admin();

        postJson("/admin/reports/MESSAGE/" + msg + "/resolve", json("{'decision':'REMOVE_CONTENT'}"), admin, 204);
        assertThat(read(getJson("/appointments/" + ap + "/messages", client), "$[0].text")).isEqualTo("Mensagem removida pela moderação.");

        String adminId = read(getJson("/me", admin), "$.accountId");
        assertThat(read(postJson("/admin/accounts/" + adminId + "/suspend", json("{'reason':'teste'}"), admin, 400), "$.code")).isEqualTo("ADMIN_SELF");
        assertThat(read(postJson("/admin/reports/PROFESSIONAL/" + p.id() + "/resolve", json("{'decision':'REMOVE_CONTENT'}"), admin, 400), "$.code"))
                .isEqualTo("REMOVE_NOT_CONTENT");
    }
}
