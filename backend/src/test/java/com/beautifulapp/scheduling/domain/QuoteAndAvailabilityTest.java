package com.beautifulapp.scheduling.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.beautifulapp.scheduling.domain.Availability.SlotStatus;

class QuoteAndAvailabilityTest {
    static final UUID FORMATO = UUID.randomUUID(), QUADRADO = UUID.randomUUID(), STILETTO = UUID.randomUUID();

    static ServiceOffer gel(boolean requiresReference) {
        return new ServiceOffer(UUID.randomUUID(), UUID.randomUUID(), "Gel", 60, 18_000, 30, requiresReference, 21,
                List.of(new ServiceOffer.Option(FORMATO, "Formato", List.of(
                        new ServiceOffer.Choice(QUADRADO, "Quadrado", 0), new ServiceOffer.Choice(STILETTO, "Stiletto", 1_500)))));
    }

    @Test
    void priceIsBasePlusChoicesPlusDesign() {
        ServiceOffer svc = gel(false);
        DesignOffer mega = new DesignOffer(UUID.randomUUID(), svc.id(), "MEGA", 3_500);
        Quote q = Quote.of(svc, Map.of(FORMATO, STILETTO), mega, null);
        assertThat(q.priceCents()).isEqualTo(23_000);
        assertThat(q.selections()).extracting(Selection::choiceLabel).containsExactly("Stiletto");
        assertThat(Quote.of(svc, Map.of(), null, null).selections()).extracting(Selection::choiceLabel).containsExactly("Quadrado"); // padrão
    }

    @Test
    void quoteRejectsWrongChoiceForeignDesignAndMissingReference() {
        ServiceOffer svc = gel(true);
        assertThatThrownBy(() -> Quote.of(svc, Map.of(FORMATO, UUID.randomUUID()), null, "ref/x.jpg")).hasMessageContaining("Formato");
        DesignOffer other = new DesignOffer(UUID.randomUUID(), UUID.randomUUID(), "PINK", 0);
        assertThatThrownBy(() -> Quote.of(svc, Map.of(), other, null)).hasMessage("Esse design não é deste serviço.");
        assertThatThrownBy(() -> Quote.of(svc, Map.of(), null, null)).extracting(e -> ((SchedulingException) e).code()).isEqualTo("REFERENCE_REQUIRED");
        assertThat(Quote.of(svc, Map.of(), null, "ref/x.jpg").referenceKey()).isEqualTo("ref/x.jpg");
    }

    @Test
    void slotsRespectBusyAndPast() {
        ZoneId sp = ZoneId.of("America/Sao_Paulo");
        LocalDate day = LocalDate.of(2026, 11, 18);
        Interval open = new WorkingHours(3, LocalTime.of(9, 0), LocalTime.of(12, 0)).on(day, sp);
        Instant nineThirty = open.start().plus(Duration.ofMinutes(30));
        var busy = List.of(new Interval(open.start().plus(Duration.ofHours(1)), open.start().plus(Duration.ofHours(2)))); // 10h–11h
        var slots = Availability.slots(open, busy, Duration.ofMinutes(60), nineThirty);
        assertThat(slots).extracting(Availability.Slot::status).containsExactly(
                SlotStatus.PAST, SlotStatus.BUSY, SlotStatus.BUSY, SlotStatus.BUSY, SlotStatus.FREE); // 9h 9h30 10h 10h30 11h
        assertThat(WorkingHours.weekdayOf(day)).isEqualTo(3);
    }

    @Test
    void conflictExplainsWhy() {
        Instant now = Instant.parse("2026-11-16T12:00:00Z");
        Interval open = new Interval(now.plus(Duration.ofHours(20)), now.plus(Duration.ofHours(28)));
        Instant s = now.plus(Duration.ofHours(21));
        assertThat(Availability.conflict(now.minusSeconds(1), now, now, Optional.of(open), List.of())).contains("Escolha um horário no futuro.");
        assertThat(Availability.conflict(s, s.plusSeconds(3600), now, Optional.empty(), List.of())).contains("A profissional não atende neste dia.");
        assertThat(Availability.conflict(now.plus(Duration.ofHours(27)), now.plus(Duration.ofHours(29)), now, Optional.of(open), List.of()))
                .contains("Horário fora do expediente da profissional.");
        assertThat(Availability.conflict(s, s.plusSeconds(3600), now, Optional.of(open), List.of(new Interval(s, s.plusSeconds(60))))).isPresent();
        assertThat(Availability.conflict(s, s.plusSeconds(3600), now, Optional.of(open), List.of())).isEmpty();
    }

    @Test
    void weekValidation() {
        var nine = LocalTime.of(9, 0);
        assertThatThrownBy(() -> WorkingHours.validateWeek(List.of(new WorkingHours(1, nine, nine.plusHours(8)), new WorkingHours(1, nine, nine.plusHours(2)))))
                .extracting(e -> ((SchedulingException) e).code()).isEqualTo("WORKDAY_DUPLICATED");
        assertThatThrownBy(() -> WorkingHours.validateWeek(List.of(new WorkingHours(2, nine, nine))))
                .extracting(e -> ((SchedulingException) e).code()).isEqualTo("WORKDAY_INVALID");
    }
}
