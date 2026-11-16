package com.beautifulapp.scheduling.internal;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.beautifulapp.ApiTestSupport;
import com.jayway.jsonpath.JsonPath;

/** Fase 5: notificações (+ lembrete do sinal), push tokens, chat, stories e próximos procedimentos. */
class SocialTest extends ApiTestSupport {
    static final ZoneId SP = ZoneId.of("America/Sao_Paulo");

    @Autowired AppointmentService appointmentService;

    @AfterEach
    void reset() { clock.reset(); }

    static String at(int plusDays, int h) {
        LocalDate d = LocalDate.now(SP).plusWeeks(1).with(TemporalAdjusters.next(DayOfWeek.MONDAY)).plusDays(plusDays);
        return ZonedDateTime.of(d.getYear(), d.getMonthValue(), d.getDayOfMonth(), h, 0, 0, 0, SP).toInstant().toString();
    }

    record Pro(String token, String id, String serviceId) {}

    Pro pro(int depositPercent) throws Exception {
        String token = newProfessional("Social " + System.nanoTime(), "UNHA", null, null);
        StringBuilder days = new StringBuilder("[");
        for (int d = 0; d <= 6; d++) days.append(d > 0 ? "," : "").append("{'weekday':%d,'start':'08:00','end':'20:00'}".formatted(d));
        send("PUT", "/me/work-hours", json(days.append("]").toString()), token, 200);
        String svc = postJson("/me/services", json("{'name':'Alongamento','niche':'UNHA','durationMin':60,'priceCents':18000,'depositPercent':%d,'returnIntervalDays':21}", depositPercent), token, 201);
        return new Pro(token, read(getJson("/me", token), "$.professional.id"), read(svc, "$.id"));
    }

    String book(Pro p, String client, String startsAt) throws Exception {
        return read(postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s'}", p.serviceId, startsAt), client, 201), "$.id");
    }

    List<String> kinds(String token) throws Exception {
        return JsonPath.read(getJson("/me/notifications", token), "$.items[*].kind");
    }

    @Test
    void notificationsFollowTheAppointment() throws Exception {
        Pro p = pro(30);
        String client = newClient();
        String id = book(p, client, at(0, 10));
        assertThat(kinds(p.token)).containsExactly("CREATED");
        assertThat(read(getJson("/me/notifications", p.token), "$.unread")).isEqualTo("1");

        postJson("/appointments/" + id + "/receipt", json("{'receiptKey':'%s'}", upload(client, "RECEIPT")), client, 200);
        assertThat(kinds(p.token)).contains("RECEIPT_SENT");
        postJson("/appointments/" + id + "/confirm-deposit", "{}", p.token, 200);
        assertThat(kinds(client)).containsExactly("DEPOSIT_CONFIRMED");
        assertThat(read(getJson("/me/notifications", client), "$.items[0].appointmentId")).isEqualTo(id);

        postJson("/appointments/" + id + "/complete", "{}", p.token, 200);
        assertThat(kinds(client)).contains("COMPLETED"); // "Como foi seu alongamento?"

        postJson("/me/notifications/read-all", "{}", p.token, 204);
        assertThat(read(getJson("/me/notifications", p.token), "$.unread")).isEqualTo("0");
    }

    @Test
    void depositReminderIsSentOnceWhenDueSoon() throws Exception {
        Pro p = pro(30);
        String client = newClient();
        book(p, client, at(0, 14));
        clock.advance(Duration.ofHours(11).plusMinutes(30)); // prazo de 12h → falta 30 min
        assertThat(appointmentService.remindDepositsDueSoon()).isGreaterThanOrEqualTo(1);
        assertThat(kinds(client)).contains("DEPOSIT_DUE_SOON");
        int before = kinds(client).size();
        appointmentService.remindDepositsDueSoon();
        assertThat(kinds(client)).hasSize(before); // só uma vez
    }

    @Test
    void devicesRegisterAndMoveBetweenAccounts() throws Exception {
        String a = newClient();
        String b = newClient();
        String token = "ExponentPushToken[" + System.nanoTime() + "]";
        postJson("/me/devices", json("{'expoPushToken':'%s','platform':'ios'}", token), a, 204);
        postJson("/me/devices", json("{'expoPushToken':'%s','platform':'ios'}", token), b, 204); // mesmo celular, outra conta
        assertThat(read(postJson("/me/devices", json("{'expoPushToken':'abc'}"), a, 400), "$.code")).isEqualTo("VALIDATION_ERROR");
        postJson("/me/devices/unregister", json("{'expoPushToken':'%s'}", token), b, 204);
    }

    @Test
    void chatBetweenParticipantsOnly() throws Exception {
        Pro p = pro(0);
        String client = newClient();
        String id = book(p, client, at(1, 10));

        postJson("/appointments/" + id + "/messages", json("{'text':'Oi! Posso levar referência?'}"), client, 201);
        postJson("/appointments/" + id + "/messages", json("{'text':'Pode sim 💜'}"), p.token, 201);
        String msgs = getJson("/appointments/" + id + "/messages", client);
        assertThat(read(msgs, "$.length()")).isEqualTo("2");
        assertThat(read(msgs, "$[0].mine")).isEqualTo("true");
        assertThat(read(msgs, "$[1].from")).isEqualTo("PROFESSIONAL");
        assertThat(kinds(p.token)).contains("CHAT_MESSAGE");
        assertThat(kinds(client)).contains("CHAT_MESSAGE");

        send("GET", "/appointments/" + id + "/messages", null, newClient(), 404);
        assertThat(read(postJson("/appointments/" + id + "/messages", json("{'text':''}"), client, 400), "$.code")).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void storiesRequireAttendanceAndExpireIn24h() throws Exception {
        Pro p = pro(0);
        String client = newClient();
        String key = upload(client, "STORY");
        String denied = postJson("/stories", json("{'professionalId':'%s','imageKey':'%s','caption':'Amei'}", p.id, key), client, 403);
        assertThat(read(denied, "$.code")).isEqualTo("NOT_ATTENDED");

        String id = book(p, client, at(2, 10));
        postJson("/appointments/" + id + "/complete", "{}", p.token, 200);
        String story = postJson("/stories", json("{'professionalId':'%s','imageKey':'%s','caption':'Amei o resultado!','serviceName':'Alongamento'}", p.id, key), client, 201);
        assertThat(read(story, "$.authorType")).isEqualTo("CLIENT");
        assertThat(read(story, "$.authorName")).isEqualTo("Cliente");
        assertThat(read(story, "$.imageUrl")).endsWith(key);

        postJson("/stories", json("{'professionalId':'%s','imageKey':'%s','caption':'Design de hoje'}", p.id, upload(p.token, "STORY")), p.token, 201);
        String ofPro = getJson("/stories?professionalId=" + p.id, client);
        assertThat(read(ofPro, "$.length()")).isEqualTo("2");
        assertThat(read(ofPro, "$[1].authorType")).isEqualTo("PROFESSIONAL");

        // profissional não pode marcar outra profissional
        Pro other = pro(0);
        postJson("/stories", json("{'professionalId':'%s','imageKey':'%s'}", other.id, upload(p.token, "STORY")), p.token, 403);

        clock.advance(Duration.ofHours(25));
        assertThat(read(getJson("/stories?professionalId=" + p.id, client), "$.length()")).isEqualTo("0");
    }

    @Test
    void nextProceduresAreSaved() throws Exception {
        String client = newClient();
        send("PUT", "/me/next-procedures", json("""
                [{'niche':'CILIOS','label':'Cílios volume russo','targetDate':'2030-01-10','done':false},
                 {'niche':'ESTETICA','label':'Criolipólise','targetDate':'2030-03-01','done':true}]"""), client, 200);
        String list = getJson("/me/next-procedures", client);
        assertThat(read(list, "$.length()")).isEqualTo("2");
        assertThat(read(list, "$[1].done")).isEqualTo("true");
        assertThat(read(list, "$[0].label")).isEqualTo("Cílios volume russo");
    }
}
