package com.beautifulapp.business;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import com.beautifulapp.ApiTestSupport;

/** Fase 4: estoque + baixa automática, lucro, fidelidade/vouchers, avaliações, clientes atrasadas. */
class BusinessTest extends ApiTestSupport {
    static final ZoneId SP = ZoneId.of("America/Sao_Paulo");

    @AfterEach
    void reset() { clock.reset(); }

    static String at(int plusDays, int h) {
        LocalDate d = LocalDate.now(SP).plusWeeks(1).with(TemporalAdjusters.next(DayOfWeek.MONDAY)).plusDays(plusDays);
        return ZonedDateTime.of(d.getYear(), d.getMonthValue(), d.getDayOfMonth(), h, 0, 0, 0, SP).toInstant().toString();
    }

    record Pro(String token, String id, String serviceId) {}

    /** Profissional que atende seg–sáb 08–20h, serviço de R$ 180 sem sinal (já nasce confirmado). */
    Pro pro() throws Exception {
        String token = newProfessional("Biz " + System.nanoTime(), "UNHA", null, null);
        StringBuilder days = new StringBuilder("[");
        for (int d = 0; d <= 6; d++) days.append(d > 0 ? "," : "").append("{'weekday':%d,'start':'08:00','end':'20:00'}".formatted(d));
        send("PUT", "/me/work-hours", json(days.append("]").toString()), token, 200);
        String svc = postJson("/me/services", json("{'name':'Alongamento','niche':'UNHA','durationMin':60,'priceCents':18000,'depositPercent':0,'returnIntervalDays':21}"), token, 201);
        return new Pro(token, read(getJson("/me", token), "$.professional.id"), read(svc, "$.id"));
    }

    String bookAndComplete(Pro p, String client, String startsAt) throws Exception {
        String id = read(postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s'}", p.serviceId, startsAt), client, 201), "$.id");
        postJson("/appointments/" + id + "/complete", "{}", p.token, 200);
        return id;
    }

    @Test
    void stockAverageCostAutomaticConsumptionAndProfit() throws Exception {
        Pro p = pro();
        String product = postJson("/me/products", json("{'name':'Gel construtor','unit':'G','minQuantity':195}"), p.token, 201);
        String productId = read(product, "$.id");

        // duas compras: 100 g a R$ 2,00/g e 100 g a R$ 4,00/g → custo médio R$ 3,00/g
        postJson("/me/products/" + productId + "/purchases", json("{'quantity':100,'unitCostCents':200}"), p.token, 200);
        String after = postJson("/me/products/" + productId + "/purchases", json("{'quantity':100,'unitCostCents':400,'lot':'L-01'}"), p.token, 200);
        assertThat(read(after, "$.quantity")).isEqualTo("200.0");
        assertThat(read(after, "$.avgCostCents")).isEqualTo("300.0");

        // o serviço consome 6 g por atendimento
        send("PUT", "/me/services/" + p.serviceId + "/consumption", json("[{'productId':'%s','amount':6}]", productId), p.token, 200);
        bookAndComplete(p, newClient(), at(0, 10));

        String stock = getJson("/me/products", p.token);
        assertThat(read(stock, "$[0].quantity")).isEqualTo("194.0");
        assertThat(read(stock, "$[0].low")).isEqualTo("true"); // 194 ≤ mínimo 195
        String moves = getJson("/me/stock-movements", p.token);
        assertThat(read(moves, "$[0].reason")).isEqualTo("ATTENDANCE");
        assertThat(read(moves, "$[0].delta")).isEqualTo("-6.0");

        // lucro: R$ 180 − 6 g × R$ 3 = R$ 162 (90%); compras do período R$ 600
        String profit = getJson("/me/analytics/profit?from=2020-01-01T00:00:00Z&to=2100-01-01T00:00:00Z", p.token);
        assertThat(read(profit, "$.revenueCents")).isEqualTo("18000");
        assertThat(read(profit, "$.costCents")).isEqualTo("1800");
        assertThat(read(profit, "$.profitCents")).isEqualTo("16200");
        assertThat(read(profit, "$.marginPercent")).isEqualTo("90");
        assertThat(read(profit, "$.purchasesCents")).isEqualTo("60000");
        assertThat(read(profit, "$.rows[0].serviceName")).isEqualTo("Alongamento");

        // ajuste manual
        assertThat(read(postJson("/me/products/" + productId + "/adjustments", json("{'delta':-4,'note':'Perda'}"), p.token, 200), "$.quantity")).isEqualTo("190.0");
    }

    @Test
    void consumptionOnlyWithOwnProducts() throws Exception {
        Pro a = pro();
        Pro b = pro();
        String foreign = read(postJson("/me/products", json("{'name':'Lixa','unit':'UN','minQuantity':0}"), b.token, 201), "$.id");
        send("PUT", "/me/services/" + a.serviceId + "/consumption", json("[{'productId':'%s','amount':1}]", foreign), a.token, 404);
        send("PUT", "/me/services/" + a.serviceId + "/consumption", json("[]"), b.token, 404); // serviço de outra
    }

    @Test
    void loyaltyIssuesVoucherAtGoalAndVoucherDiscountsBooking() throws Exception {
        Pro p = pro();
        send("PUT", "/me/loyalty-program", json("{'enabled':true,'goalCents':30000,'discountPercent':10}"), p.token, 200);
        String client = newClient();

        bookAndComplete(p, client, at(0, 9));
        assertThat(read(getJson("/me/vouchers", client), "$.length()")).isEqualTo("0");
        bookAndComplete(p, client, at(0, 11)); // R$ 360 gastos ≥ meta R$ 300 → 1 voucher

        String vouchers = getJson("/me/vouchers", client);
        assertThat(read(vouchers, "$.length()")).isEqualTo("1");
        assertThat(read(vouchers, "$[0].kind")).isEqualTo("LOYALTY");
        assertThat(read(vouchers, "$[0].percent")).isEqualTo("10");
        String card = getJson("/me/loyalty", client);
        assertThat(read(card, "$[0].spentCents")).isEqualTo("36000");
        assertThat(read(card, "$[0].percent")).isEqualTo("20"); // R$ 60 de R$ 300 no ciclo atual
        assertThat(read(card, "$[0].cycles")).isEqualTo("1");

        // usa o voucher: 10% de R$ 180
        String voucherId = read(vouchers, "$[0].id");
        String booked = postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s','voucherId':'%s'}", p.serviceId, at(1, 10), voucherId), client, 201);
        assertThat(read(booked, "$.discountCents")).isEqualTo("1800");
        assertThat(read(booked, "$.totalCents")).isEqualTo("16200");
        assertThat(read(getJson("/me/vouchers", client), "$[0].used")).isEqualTo("true");
        assertThat(read(postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s','voucherId':'%s'}", p.serviceId, at(1, 12), voucherId), client, 400), "$.code"))
                .isEqualTo("VOUCHER_USED");

        // cancelou → voucher volta
        postJson("/appointments/" + read(booked, "$.id") + "/cancel", "{}", client, 200);
        assertThat(read(getJson("/me/vouchers", client), "$[0].used")).isEqualTo("false");

        // voucher de outra profissional não vale
        Pro other = pro();
        assertThat(read(postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s','voucherId':'%s'}", other.serviceId, at(1, 10), voucherId), client, 400), "$.code"))
                .isEqualTo("VOUCHER_OTHER_PROFESSIONAL");
    }

    @Test
    void reviewsGiveMonthlyVoucherAndShowOnProfile() throws Exception {
        Pro p = pro();
        String client = newClient();
        String pending = read(postJson("/appointments", json("{'serviceId':'%s','startsAt':'%s'}", p.serviceId, at(2, 9)), client, 201), "$.id");
        assertThat(read(postJson("/appointments/" + pending + "/review", json("{'rating':5}"), client, 409), "$.code")).isEqualTo("NOT_COMPLETED");

        String a1 = bookAndComplete(p, client, at(2, 11));
        String first = postJson("/appointments/" + a1 + "/review", json("{'rating':5,'comment':'Perfeitas!'}"), client, 201);
        assertThat(read(first, "$.voucher.kind")).isEqualTo("FEEDBACK");
        assertThat(read(first, "$.voucher.professionalId")).isNull(); // vale com qualquer profissional
        assertThat(read(postJson("/appointments/" + a1 + "/review", json("{'rating':4}"), client, 409), "$.code")).isEqualTo("ALREADY_REVIEWED");

        String a2 = bookAndComplete(p, client, at(2, 13));
        assertThat(read(postJson("/appointments/" + a2 + "/review", json("{'rating':4}"), client, 201), "$.voucher")).isNull(); // 1 por mês

        String page = getJson("/professionals/" + p.id, client);
        assertThat(read(page, "$.rating.count")).isEqualTo("2");
        assertThat(read(page, "$.rating.average")).isEqualTo("4.5");
        assertThat(read(page, "$.reviews[1].comment")).isEqualTo("Perfeitas!");
        assertThat(read(getJson("/me/reviews", client), "$.length()")).isEqualTo("2");
        send("POST", "/appointments/" + a2 + "/review", json("{'rating':5}"), newClient(), 404); // outra cliente
    }

    @Test
    void overdueClientsAfterReturnInterval() throws Exception {
        Pro p = pro();
        String client = newClient();
        bookAndComplete(p, client, at(0, 15));
        assertThat(read(getJson("/me/analytics/overdue-clients", p.token), "$.length()")).isEqualTo("0");

        clock.advance(Duration.ofDays(40)); // passou o intervalo de 21 dias
        String overdue = getJson("/me/analytics/overdue-clients", p.token);
        assertThat(read(overdue, "$[0].name")).isEqualTo("Cliente");
        assertThat(read(overdue, "$[0].serviceName")).isEqualTo("Alongamento");
        assertThat(Integer.parseInt(read(overdue, "$[0].daysLate"))).isPositive();
    }
}
