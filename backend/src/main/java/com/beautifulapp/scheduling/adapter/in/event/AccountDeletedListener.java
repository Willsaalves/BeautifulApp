package com.beautifulapp.scheduling.adapter.in.event;

import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.AccountDeleted;
import com.beautifulapp.scheduling.application.port.in.AppointmentHousekeeping;

/** Exclusão de conta: atendimentos em andamento são cancelados (a outra parte é avisada). */
@Component
class AccountDeletedListener {
    private final AppointmentHousekeeping housekeeping;

    AccountDeletedListener(AppointmentHousekeeping housekeeping) { this.housekeeping = housekeeping; }

    @EventListener
    @Order(0) // antes dos outros módulos limparem perfil e notificações
    void on(AccountDeleted e) { housekeeping.cancelAllOf(e.accountId()); }
}
