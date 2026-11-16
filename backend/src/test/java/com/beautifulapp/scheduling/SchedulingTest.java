package com.beautifulapp.scheduling;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.beautifulapp.ApiTestSupport;
import com.beautifulapp.scheduling.application.port.in.AppointmentHousekeeping;
import com.jayway.jsonpath.JsonPath;

class SchedulingTest extends ApiTestSupport {
    static final ZoneId SP = ZoneId.of("America/Sao_Paulo");

    @Autowired AppointmentHousekeeping appointmentService;

    @AfterEach
    void reset() { clock.reset(); }

    /** Segunda-feira daqui a 1–2 semanas (sempre no futuro). */
    static LocalDate monday() {
        return LocalDate.now(SP).plusWeeks(1).with(TemporalAdjusters.next(DayOfWeek.MONDAY));
    }

    static String at(LocalDate d, int h, int m) {
        return ZonedDateTime.of(d.getYear(), d.getMonthValue(), d.getDayOfMonth(), h, m, 0, 0, SP).toInstant().toString();
    }

    record Setup(String proToken, String proId, String serviceId, String stilettoOptionId, String stilettoId, String designId) {}

    Setup pro(boolean requiresReference, int depositPercent) throws Exception {
        String token = newProfessional("Studio " + System.nanoTime(), "UNHA", null, null);
        send("PUT", "/me/work-hours", json("""
                [{'weekday':1,'start':'09:00','end':'18:00'},{'weekday':2,'start':'09:00','end':'18:00'},
                 {'weekday':3,'start':'09:00','end':'18:00'},{'weekday':4,'start':'09:00','end':'18:00'},
                 {'weekday':5,'start':'09:00','end':'18:00'},{'weekday':6,'start':'09:00','end':'14:00'}]"""), token, 200);
        String svc = postJson("/me/services", json("""
                {'name':'Alongamento em gel','niche':'UNHA','durationMin':60,'priceCents':18000,'depositPercent':%d,
                 'returnIntervalDays':21,'requiresReference':%s,
                 'options':[{'label':'Formato','choices':[{'label':'Quadrada','priceDeltaCents':0},{'label':'Stiletto','priceDeltaCents':2000}]}]}""",
                depositPercent, requiresReference), token, 201);
        String serviceId = read(svc, "$.id");
        String designId = read(postJson("/me/designs", json("{'serviceId':'%s','name':'MEGA','imageKey':'%s','priceDeltaCents':3500}", serviceId, upload(token, "DESIGN")), token, 201), "$.id");
        return new Setup(token, read(getJson("/me", token), "$.professional.id"), serviceId,
                read(svc, "$.options[0].id"), read(svc, "$.options[0].choices[1].id"), designId);
    }

    String book(Setup s, String client, String startsAt, int expected) throws Exception {
        return postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s','selections':[{'optionId':'%s','choiceId':'%s'}],'designId':'%s'}",
                s.serviceId, startsAt, s.stilettoOptionId, s.stilettoId, s.designId), client, expected);
    }

    @Test
    void workHoursValidation() throws Exception {
        String token = newProfessional("WH", "UNHA", null, null);
        assertThat(read(send("PUT", "/me/work-hours", json("[{'weekday':1,'start':'18:00','end':'09:00'}]"), token, 400), "$.code")).isEqualTo("WORKDAY_INVALID");
        assertThat(read(send("PUT", "/me/work-hours", json("[{'weekday':1,'start':'09:00','end':'18:00'},{'weekday':1,'start':'09:00','end':'12:00'}]"), token, 400), "$.code"))
                .isEqualTo("WORKDAY_DUPLICATED");
        String ok = send("PUT", "/me/work-hours", json("[{'weekday':2,'start':'10:00','end':'16:00'}]"), token, 200);
        assertThat(read(ok, "$[0].start")).startsWith("10:00");
    }

    @Test
    void priceAndDepositAreComputedOnServer() throws Exception {
        Setup s = pro(false, 30);
        String a = book(s, newClient(), at(monday(), 10, 0), 201);
        // 180 + stiletto 20 + design MEGA 35 = 235; sinal 30% = 70,50
        assertThat(read(a, "$.priceCents")).isEqualTo("23500");
        assertThat(read(a, "$.depositCents")).isEqualTo("7050");
        assertThat(read(a, "$.status")).isEqualTo("AWAITING_DEPOSIT");
        assertThat(read(a, "$.designName")).isEqualTo("MEGA");
        assertThat(read(a, "$.selections[0].choiceLabel")).isEqualTo("Stiletto");
        assertThat(read(a, "$.professional.pixKey")).isNull(); // newProfessional não define pix
        Instant due = Instant.parse(read(a, "$.depositDueAt"));
        assertThat(Duration.between(Instant.now(), due).toHours()).isBetween(11L, 12L); // prazo padrão 12h
    }

    @Test
    void availabilityReflectsBookingsAndBlocks() throws Exception {
        Setup s = pro(false, 30);
        LocalDate day = monday();
        String url = "/professionals/%s/availability?date=%s&serviceId=%s".formatted(s.proId, day, s.serviceId);
        List<String> before = JsonPath.read(getJson(url, s.proToken), "$[*].status");
        assertThat(before).hasSize(17).containsOnly("FREE"); // 09:00…17:00 para serviço de 60 min

        book(s, newClient(), at(day, 10, 0), 201);
        postJson("/me/blocks", json("{'startsAt':'%s','endsAt':'%s','reason':'Almoço'}", at(day, 12, 0), at(day, 13, 0)), s.proToken, 201);

        String after = getJson(url, s.proToken);
        assertThat(slot(after, day, 9, 30)).isEqualTo("BUSY");  // 9:30–10:30 cruza 10:00–11:00
        assertThat(slot(after, day, 10, 0)).isEqualTo("BUSY");
        assertThat(slot(after, day, 11, 0)).isEqualTo("FREE");
        assertThat(slot(after, day, 11, 30)).isEqualTo("BUSY"); // cruza o almoço
        assertThat(slot(after, day, 13, 0)).isEqualTo("FREE");

        // agendar dentro do bloqueio, fora do expediente ou no domingo é recusado
        assertThat(read(book(s, newClient(), at(day, 12, 0), 409), "$.code")).isEqualTo("SLOT_UNAVAILABLE");
        assertThat(read(book(s, newClient(), at(day, 17, 30), 409), "$.code")).isEqualTo("SLOT_UNAVAILABLE");
        assertThat(read(book(s, newClient(), at(day.minusDays(1), 10, 0), 409), "$.code")).isEqualTo("SLOT_UNAVAILABLE");
    }

    private static String slot(String body, LocalDate day, int h, int m) {
        List<String> status = JsonPath.read(body, "$[?(@.start == '%s')].status".formatted(at(day, h, m)));
        return status.isEmpty() ? null : status.get(0);
    }

    @Test
    void sameSlotCannotBeBookedTwiceEvenConcurrently() throws Exception {
        Setup s = pro(false, 30);
        String start = at(monday(), 15, 0);
        List<String> clients = new ArrayList<>();
        for (int i = 0; i < 6; i++) clients.add(newClient());

        var pool = Executors.newFixedThreadPool(6);
        List<Callable<Integer>> calls = new ArrayList<>();
        for (String c : clients) {
            calls.add(() -> mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/appointments")
                    .contentType("application/json").header("Authorization", "Bearer " + c)
                    .content(json("{'serviceId':'%s','startsAt':'%s'}", s.serviceId, start))).andReturn().getResponse().getStatus());
        }
        List<Integer> statuses = new ArrayList<>();
        for (var f : pool.invokeAll(calls)) statuses.add(f.get());
        pool.shutdown();
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses.stream().filter(x -> x == 201).count()).isEqualTo(1);
    }

    @Test
    void referenceRequiredUnlessDesignChosen() throws Exception {
        Setup s = pro(true, 30);
        String client = newClient();
        String noRef = postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s'}", s.serviceId, at(monday(), 9, 0)), client, 400);
        assertThat(read(noRef, "$.code")).isEqualTo("REFERENCE_REQUIRED");
        String withRef = postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s','referenceKey':'%s'}",
                s.serviceId, at(monday(), 9, 0), upload(client, "REFERENCE")), client, 201);
        assertThat(read(withRef, "$.referenceUrl")).contains("X-Amz-Signature"); // privado: link assinado
        book(s, client, at(monday(), 11, 0), 201); // com design também vale
    }

    @Test
    void fullDepositFlowWithAdjustment() throws Exception {
        Setup s = pro(false, 30);
        String client = newClient();
        String id = read(book(s, client, at(monday(), 14, 0), 201), "$.id");

        // cliente envia o comprovante (obrigatório: precisa ser um upload dela, tipo RECEIPT)
        String foreign = upload(newClient(), "RECEIPT");
        assertThat(read(postJson("/appointments/" + id + "/receipt", json("{'receiptKey':'%s'}", foreign), client, 400), "$.code")).isEqualTo("MEDIA_NOT_OWNED");
        String sent = postJson("/appointments/" + id + "/receipt", json("{'receiptKey':'%s'}", upload(client, "RECEIPT")), client, 200);
        assertThat(read(sent, "$.status")).isEqualTo("RECEIPT_SENT");
        assertThat(read(sent, "$.receiptUrl")).contains("X-Amz-Signature");

        // só a profissional confirma
        assertThat(read(postJson("/appointments/" + id + "/confirm-deposit", "{}", client, 403), "$.code")).isEqualTo("NOT_PROFESSIONAL");
        assertThat(read(postJson("/appointments/" + id + "/confirm-deposit", "{}", s.proToken, 200), "$.status")).isEqualTo("CONFIRMED");

        // ajuste de valor: profissional propõe, cliente aceita, volta a confirmado com o preço novo
        String adj = postJson("/appointments/" + id + "/adjustment", json("{'newPriceCents':26000,'note':'Decoração extra'}"), s.proToken, 200);
        assertThat(read(adj, "$.status")).isEqualTo("ADJUSTMENT_PENDING");
        assertThat(read(adj, "$.adjustment.status")).isEqualTo("PENDING");
        String accepted = postJson("/appointments/" + id + "/adjustment/accept", "{}", client, 200);
        assertThat(read(accepted, "$.status")).isEqualTo("CONFIRMED");
        assertThat(read(accepted, "$.priceCents")).isEqualTo("26000");

        String done = postJson("/appointments/" + id + "/complete", "{}", s.proToken, 200);
        assertThat(read(done, "$.status")).isEqualTo("COMPLETED");
        assertThat(read(postJson("/appointments/" + id + "/cancel", "{}", client, 409), "$.code")).isEqualTo("INVALID_STATE");
    }

    @Test
    void rejectedReceiptGoesBackToAwaiting() throws Exception {
        Setup s = pro(false, 30);
        String client = newClient();
        String id = read(book(s, client, at(monday(), 16, 0), 201), "$.id");
        postJson("/appointments/" + id + "/receipt", json("{'receiptKey':'%s'}", upload(client, "RECEIPT")), client, 200);
        String back = postJson("/appointments/" + id + "/reject-receipt", "{}", s.proToken, 200);
        assertThat(read(back, "$.status")).isEqualTo("AWAITING_DEPOSIT");
        assertThat(read(back, "$.receiptUrl")).isNull();
    }

    @Test
    void unpaidDepositExpiresAndFreesTheSlot() throws Exception {
        Setup s = pro(false, 30);
        String start = at(monday(), 9, 0);
        String id = read(book(s, newClient(), start, 201), "$.id");
        book(s, newClient(), start, 409); // ocupado

        clock.advance(Duration.ofHours(13)); // prazo de 12h passou
        assertThat(appointmentService.expireOverdueDeposits()).isGreaterThanOrEqualTo(1);
        assertThat(read(getJson("/appointments/" + id, s.proToken), "$.status")).isEqualTo("EXPIRED");

        book(s, newClient(), start, 201); // horário liberado
    }

    @Test
    void zeroDepositIsConfirmedImmediately() throws Exception {
        Setup s = pro(false, 0);
        String a = book(s, newClient(), at(monday(), 10, 0), 201);
        assertThat(read(a, "$.status")).isEqualTo("CONFIRMED");
        assertThat(read(a, "$.depositCents")).isEqualTo("0");
    }

    @Test
    void privacyAndListings() throws Exception {
        Setup s = pro(false, 30);
        String client = newClient();
        String id = read(book(s, client, at(monday(), 11, 0), 201), "$.id");

        send("GET", "/appointments/" + id, null, newClient(), 404);                                // outra cliente
        postJson("/appointments/" + id + "/confirm-deposit", "{}", pro(false, 30).proToken, 404);  // outra profissional

        assertThat(read(getJson("/me/appointments", client), "$[0].id")).isEqualTo(id);
        String agenda = getJson("/me/agenda", s.proToken);
        assertThat(read(agenda, "$[0].client.name")).isEqualTo("Cliente");
        assertThat(read(agenda, "$[0].client.phone")).startsWith("+55");

        // página pública traz o expediente
        assertThat(read(getJson("/professionals/" + s.proId, client), "$.workHours.length()")).isEqualTo("6");

        // cliente cancela
        String cancelled = postJson("/appointments/" + id + "/cancel", "{}", client, 200);
        assertThat(read(cancelled, "$.status")).isEqualTo("CANCELLED");
        assertThat(read(cancelled, "$.cancelledBy")).isEqualTo("CLIENT");
    }
}
