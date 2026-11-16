package com.beautifulapp.scheduling.adapter.in.job;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.beautifulapp.scheduling.application.port.in.AppointmentHousekeeping;

/** Adaptador de relógio: dispara as tarefas periódicas. Desligável em testes: app.scheduling.jobs=false */
@Component
@ConditionalOnProperty(name = "app.scheduling.jobs", havingValue = "true", matchIfMissing = true)
class SchedulingJobs {
    private final AppointmentHousekeeping housekeeping;

    SchedulingJobs(AppointmentHousekeeping housekeeping) { this.housekeeping = housekeeping; }

    /** A cada minuto: expira sinais vencidos e libera o horário. */
    @Scheduled(fixedDelayString = "${app.scheduling.expiry-interval:60000}", initialDelay = 10_000)
    void expireOverdueDeposits() { housekeeping.expireOverdueDeposits(); }

    /** A cada 5 min: lembra a cliente quando falta menos de 1h para o sinal vencer. */
    @Scheduled(fixedDelayString = "${app.scheduling.reminder-interval:300000}", initialDelay = 20_000)
    void remindDepositsDueSoon() { housekeeping.remindDepositsDueSoon(); }

    @Configuration
    @EnableScheduling
    @ConditionalOnProperty(name = "app.scheduling.jobs", havingValue = "true", matchIfMissing = true)
    static class Config {}
}
