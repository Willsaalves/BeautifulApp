package com.beautifulapp.scheduling.application.port.out;

import java.util.List;

import com.beautifulapp.scheduling.domain.AppointmentChanged;

/** Para onde vão os eventos de domínio (hoje: eventos do Spring; amanhã: fila). */
public interface EventPublisher {
    void publish(List<AppointmentChanged> events);
}
