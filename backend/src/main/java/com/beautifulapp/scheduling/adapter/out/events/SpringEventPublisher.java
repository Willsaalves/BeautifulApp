package com.beautifulapp.scheduling.adapter.out.events;

import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import com.beautifulapp.common.AppointmentCompleted;
import com.beautifulapp.common.AppointmentEvent;
import com.beautifulapp.common.Ids;
import com.beautifulapp.scheduling.application.port.out.EventPublisher;
import com.beautifulapp.scheduling.domain.AppointmentChanged;
import com.beautifulapp.scheduling.domain.AppointmentChanged.Change;

/**
 * Traduz os eventos de domínio para os eventos que o resto do sistema escuta (definidos em common):
 * AppointmentEvent para notificações e AppointmentCompleted para estoque e fidelidade.
 */
@Component
class SpringEventPublisher implements EventPublisher {
    private final ApplicationEventPublisher events;

    SpringEventPublisher(ApplicationEventPublisher events) { this.events = events; }

    @Override
    public void publish(List<AppointmentChanged> changes) {
        for (AppointmentChanged c : changes) {
            if (c.change() == Change.COMPLETED) {
                events.publishEvent(new AppointmentCompleted(c.appointmentId(), c.professionalId(), c.clientAccountId(), c.serviceId(), c.paidCents(),
                        Ids.newId(), c.occurredAt()));
            }
            events.publishEvent(new AppointmentEvent(AppointmentEvent.Kind.valueOf(c.change().name()), c.appointmentId(), c.clientAccountId(),
                    c.professionalId(), c.serviceName(), c.startsAt(), c.depositDueAt(), Ids.newId(), c.occurredAt()));
        }
    }
}
