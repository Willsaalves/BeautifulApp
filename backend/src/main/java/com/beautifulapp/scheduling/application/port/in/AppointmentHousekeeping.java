package com.beautifulapp.scheduling.application.port.in;

import java.util.UUID;

/** Tarefas do sistema: rodam por agendamento (jobs) ou reagindo a eventos de outros módulos. */
public interface AppointmentHousekeeping {
    /** Sinais vencidos: expira e libera o horário. Devolve quantos expiraram. */
    int expireOverdueDeposits();

    /** Avisa quando falta menos de 1h para o sinal vencer (uma vez por agendamento). */
    int remindDepositsDueSoon();

    /** Exclusão de conta: cancela tudo que está em andamento dela e avisa o outro lado. */
    void cancelAllOf(UUID accountId);
}
