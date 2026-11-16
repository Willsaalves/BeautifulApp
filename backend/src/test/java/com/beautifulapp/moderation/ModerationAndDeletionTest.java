package com.beautifulapp.moderation;

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

/** Exigências das lojas: excluir conta, denunciar conteúdo e bloquear pessoas. */
class ModerationAndDeletionTest extends ApiTestSupport {
    static final ZoneId SP = ZoneId.of("America/Sao_Paulo");

    record Pro(String token, String phone, String id, String serviceId) {}

    static String at(int plusDays, int h) {
        LocalDate d = LocalDate.now(SP).plusWeeks(1).with(TemporalAdjusters.next(DayOfWeek.MONDAY)).plusDays(plusDays);
        return ZonedDateTime.of(d.getYear(), d.getMonthValue(), d.getDayOfMonth(), h, 0, 0, 0, SP).toInstant().toString();
    }

    Pro pro(String studio) throws Exception {
        String phone = newPhone();
        String token = read(login(phone), "$.accessToken");
        postJson("/me/onboarding", json("{'role':'PROFESSIONAL','name':'Pro','studio':'%s','niche':'UNHA','neighborhood':'Moema','acceptedTerms':true}", studio), token, 200);
        StringBuilder days = new StringBuilder("[");
        for (int d = 0; d <= 6; d++) days.append(d > 0 ? "," : "").append("{'weekday':%d,'start':'08:00','end':'20:00'}".formatted(d));
        send("PUT", "/me/work-hours", json(days.append("]").toString()), token, 200);
        String svc = postJson("/me/services", json("{'name':'Gel','niche':'UNHA','durationMin':60,'priceCents':10000,'depositPercent':0,'returnIntervalDays':21}"), token, 201);
        return new Pro(token, phone, read(getJson("/me", token), "$.professional.id"), read(svc, "$.id"));
    }

    String book(Pro p, String client, String startsAt, int status) throws Exception {
        return postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s'}", p.serviceId, startsAt), client, status);
    }

    List<String> searchIds(String token, String studio) throws Exception {
        return JsonPath.read(getJson("/professionals?q=" + studio, token), "$[*].id");
    }

    @Test
    void blockingHidesTheProfessionalAndStopsBookingAndChat() throws Exception {
        String studio = "Bloq" + System.nanoTime();
        Pro p = pro(studio);
        String client = newClient();
        String apId = read(book(p, client, at(0, 10), 201), "$.id");

        String blocked = postJson("/me/blocked", json("{'professionalId':'%s'}", p.id), client, 200);
        assertThat(read(blocked, "$.professionalId")).isEqualTo(p.id);
        assertThat(read(blocked, "$.name")).isEqualTo(studio);
        String proAccount = read(blocked, "$.accountId");

        assertThat(searchIds(client, studio)).isEmpty();
        send("GET", "/professionals/" + p.id, null, client, 404);
        assertThat(read(book(p, client, at(1, 10), 403), "$.code")).isEqualTo("BLOCKED");
        // vale nos dois sentidos: a profissional também não consegue mandar mensagem
        assertThat(read(postJson("/appointments/" + apId + "/messages", json("{'text':'oi'}"), p.token, 403), "$.code")).isEqualTo("BLOCKED");
        assertThat(read(getJson("/me/blocked", client), "$.length()")).isEqualTo("1");

        send("DELETE", "/me/blocked/" + proAccount, null, client, 204);
        assertThat(searchIds(client, studio)).containsExactly(p.id);
        book(p, client, at(1, 10), 201);
    }

    @Test
    void cannotBlockOrReportYourself() throws Exception {
        Pro p = pro("Self" + System.nanoTime());
        assertThat(read(postJson("/me/blocked", json("{'professionalId':'%s'}", p.id), p.token, 400), "$.code")).isEqualTo("BLOCK_SELF");
        assertThat(read(postJson("/reports", json("{'targetType':'PROFESSIONAL','targetId':'%s','reason':'SPAM'}", p.id), p.token, 400), "$.code"))
                .isEqualTo("REPORT_SELF");
    }

    @Test
    void storyLeavesAfterThreeDifferentReports() throws Exception {
        Pro p = pro("Story" + System.nanoTime());
        String story = read(postJson("/stories", json("{'professionalId':'%s','imageKey':'%s'}", p.id, upload(p.token, "STORY")), p.token, 201), "$.id");
        String body = json("{'targetType':'STORY','targetId':'%s','reason':'INAPPROPRIATE','details':'foto imprópria'}", story);

        String c1 = newClient(), c2 = newClient(), c3 = newClient();
        postJson("/reports", body, c1, 201);
        postJson("/reports", body, c1, 201); // repetir não conta duas vezes
        postJson("/reports", body, c2, 201);
        assertThat((List<String>) JsonPath.read(getJson("/stories?professionalId=" + p.id, c3), "$[*].id")).contains(story);
        postJson("/reports", body, c3, 201);
        assertThat((List<String>) JsonPath.read(getJson("/stories?professionalId=" + p.id, c3), "$[*].id")).doesNotContain(story);
    }

    @Test
    void clientDeletesAccount() throws Exception {
        Pro p = pro("Del" + System.nanoTime());
        String phone = newPhone();
        String client = read(login(phone), "$.accessToken");
        postJson("/me/onboarding", json("{'role':'CLIENT','name':'Bruna Cliente','email':'bruna@example.com','acceptedTerms':true}"), client, 200);
        String apId = read(book(p, client, at(2, 10), 201), "$.id");
        send("PUT", "/me/favorites/" + p.id, null, client, 204);

        send("DELETE", "/me", null, client, 204);

        send("GET", "/me", null, client, 401); // o token antigo deixa de valer na hora
        String ap = getJson("/appointments/" + apId, p.token);
        assertThat(read(ap, "$.status")).isEqualTo("CANCELLED");
        assertThat((List<String>) JsonPath.read(getJson("/me/notifications", p.token), "$.items[*].kind")).contains("CANCELLED_BY_CLIENT");
        // o celular fica livre para uma conta nova
        assertThat(read(login(phone), "$.isNew")).isEqualTo("true");
    }

    @Test
    void professionalDeletesAccount() throws Exception {
        String studio = "Sai" + System.nanoTime();
        Pro p = pro(studio);
        String client = newClient();
        String apId = read(book(p, client, at(3, 10), 201), "$.id");

        send("DELETE", "/me", null, p.token, 204);

        assertThat(searchIds(client, studio)).isEmpty();
        send("GET", "/professionals/" + p.id, null, client, 404);
        assertThat(read(getJson("/appointments/" + apId, client), "$.status")).isEqualTo("CANCELLED");
        assertThat(read(book(p, client, at(4, 10), 404), "$.code")).isEqualTo("SERVICE_NOT_FOUND");
    }
}
