package com.beautifulapp.scheduling.internal;

import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.AccountDeleted;
import com.beautifulapp.profile.ProfileApi;

/** Exclusão de conta: atendimentos em andamento são cancelados (a outra parte é avisada). Os concluídos ficam no histórico. */
@Component
class SchedulingDeletionListener {
    private final AppointmentService appointments;
    private final ProfileApi profiles;

    SchedulingDeletionListener(AppointmentService appointments, ProfileApi profiles) {
        this.appointments = appointments;
        this.profiles = profiles;
    }

    @EventListener
    @Order(0) // antes dos outros módulos limparem perfil e notificações
    void on(AccountDeleted e) {
        appointments.cancelAllOf(e.accountId(), profiles.professionalIdOf(e.accountId()).orElse(null));
    }
}
