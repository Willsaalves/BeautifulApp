package com.beautifulapp.scheduling.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.beautifulapp.scheduling.domain.AppointmentChanged.Change;

/** Regras do agendamento sem Spring, sem banco: rodam em milissegundos. */
class AppointmentTest {
    static final Instant NOW = Instant.parse("2026-11-16T12:00:00Z");
    static final Instant START = NOW.plus(Duration.ofDays(3));
    static final UUID CLIENT = UUID.randomUUID();

    static ServiceOffer service(int depositPercent) {
        return new ServiceOffer(UUID.randomUUID(), UUID.randomUUID(), "Alongamento em gel", 120, 18_000, depositPercent, false, 21, List.of());
    }

    static Appointment booked(int depositPercent, int discountPercent) {
        Quote q = Quote.of(service(depositPercent), Map.of(), null, null);
        return Appointment.book(UUID.randomUUID(), CLIENT, q, START, "  levar referência  ", discountPercent, 12, NOW);
    }

    @Test
    void bookingWithDepositWaitsForReceipt() {
        Appointment a = booked(30, 0);
        var s = a.state();
        assertThat(s.status()).isEqualTo(AppointmentStatus.AWAITING_DEPOSIT);
        assertThat(s.depositCents()).isEqualTo(5_400);
        assertThat(s.depositDueAt()).isEqualTo(NOW.plus(Duration.ofHours(12)));
        assertThat(s.endsAt()).isEqualTo(START.plus(Duration.ofMinutes(120)));
        assertThat(s.notes()).isEqualTo("levar referência");
        assertThat(a.pullEvents()).extracting(AppointmentChanged::change).containsExactly(Change.CREATED);
        assertThat(a.pullEvents()).isEmpty(); // retirados uma vez só
    }

    @Test
    void bookingWithoutDepositIsConfirmedAndDiscountReducesDeposit() {
        assertThat(booked(0, 0).status()).isEqualTo(AppointmentStatus.CONFIRMED);
        Appointment a = booked(50, 10);
        assertThat(a.state().discountCents()).isEqualTo(1_800);
        assertThat(a.state().depositCents()).isEqualTo(8_100); // 50% de 162,00
        assertThat(a.paidCents()).isEqualTo(16_200);
    }

    @Test
    void fullDepositFlow() {
        Appointment a = booked(30, 0);
        a.attachReceipt("receipt/x.jpg", NOW);
        a.rejectReceipt(NOW.plus(Duration.ofHours(11)));
        assertThat(a.status()).isEqualTo(AppointmentStatus.AWAITING_DEPOSIT);
        assertThat(a.state().receiptKey()).isNull();
        assertThat(a.depositDueAt()).isEqualTo(NOW.plus(Duration.ofHours(13))); // pelo menos 2h a mais
        a.attachReceipt("receipt/y.jpg", NOW);
        a.confirmDeposit(NOW);
        a.complete(NOW);
        assertThat(a.status()).isEqualTo(AppointmentStatus.COMPLETED);
        assertThat(a.pullEvents()).extracting(AppointmentChanged::change).containsExactly(
                Change.CREATED, Change.RECEIPT_SENT, Change.RECEIPT_REJECTED, Change.RECEIPT_SENT, Change.DEPOSIT_CONFIRMED, Change.COMPLETED);
    }

    @Test
    void cannotCompleteBeforeDeposit() {
        Appointment a = booked(30, 0);
        assertThatThrownBy(() -> a.complete(NOW)).isInstanceOf(SchedulingException.class)
                .hasMessage("Ação indisponível: o agendamento está aguardando o sinal.")
                .extracting(e -> ((SchedulingException) e).code()).isEqualTo("INVALID_STATE");
    }

    @Test
    void adjustmentReturnsToPreviousStatus() {
        Appointment a = booked(0, 0);
        a.proposeAdjustment(25_000, " referência com pedrarias ", NOW);
        assertThat(a.status()).isEqualTo(AppointmentStatus.ADJUSTMENT_PENDING);
        a.respondAdjustment(true, NOW);
        assertThat(a.status()).isEqualTo(AppointmentStatus.CONFIRMED);
        assertThat(a.state().priceCents()).isEqualTo(25_000);
        assertThat(a.state().adjNote()).isEqualTo("referência com pedrarias");

        Appointment b = booked(0, 0);
        b.proposeAdjustment(25_000, null, NOW);
        b.respondAdjustment(false, NOW);
        assertThat(b.state().priceCents()).isEqualTo(18_000);
        assertThat(b.state().adjStatus()).isEqualTo("DECLINED");
    }

    @Test
    void cancelTellsWhetherAVoucherMustBeReleased() {
        assertThat(booked(30, 10).cancel(Appointment.Party.CLIENT, NOW)).isTrue();
        Appointment a = booked(30, 0);
        assertThat(a.cancel(Appointment.Party.PROFESSIONAL, NOW)).isFalse();
        assertThat(a.state().cancelledBy()).isEqualTo("PROFESSIONAL");
        assertThatThrownBy(() -> a.cancel(Appointment.Party.CLIENT, NOW)).hasMessageContaining("cancelado");
    }

    @Test
    void depositReminderOnlyOnce() {
        Appointment a = booked(30, 0);
        a.pullEvents();
        a.remindDeposit(NOW);
        a.remindDeposit(NOW);
        assertThat(a.pullEvents()).extracting(AppointmentChanged::change).containsExactly(Change.DEPOSIT_DUE_SOON);
    }

    @Test
    void depositDeadlineNeverAfterOneHourBeforeAndAtLeastTenMinutes() {
        assertThat(DepositPolicy.deadline(NOW, NOW.plus(Duration.ofHours(5)), 12)).isEqualTo(NOW.plus(Duration.ofHours(4)));
        assertThat(DepositPolicy.deadline(NOW, NOW.plus(Duration.ofMinutes(30)), 12)).isEqualTo(NOW.plus(Duration.ofMinutes(10)));
        assertThat(DepositPolicy.deadline(NOW, NOW.plus(Duration.ofMinutes(5)), 12)).isEqualTo(NOW.plus(Duration.ofMinutes(5)));
    }
}
