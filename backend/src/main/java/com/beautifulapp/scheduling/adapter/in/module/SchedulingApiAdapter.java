package com.beautifulapp.scheduling.adapter.in.module;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.beautifulapp.scheduling.AppointmentInfo;
import com.beautifulapp.scheduling.SchedulingApi;
import com.beautifulapp.scheduling.WorkDay;
import com.beautifulapp.scheduling.application.port.in.AppointmentQueries;
import com.beautifulapp.scheduling.application.port.in.ManageSchedule;

/** A API pública do módulo (usada por review, chat, story, discovery) é só mais um adaptador de entrada. */
@Component
class SchedulingApiAdapter implements SchedulingApi {
    private final AppointmentQueries queries;
    private final ManageSchedule schedule;

    SchedulingApiAdapter(AppointmentQueries queries, ManageSchedule schedule) {
        this.queries = queries;
        this.schedule = schedule;
    }

    @Override
    public List<WorkDay> workHours(UUID professionalId) {
        return schedule.week(professionalId).stream().map(w -> new WorkDay(w.weekday(), w.start(), w.end())).toList();
    }

    @Override
    public Optional<AppointmentInfo> appointment(UUID appointmentId) {
        return queries.find(appointmentId).map(a -> new AppointmentInfo(a.id(), a.clientAccountId(), a.professionalId(), a.serviceId(),
                a.serviceName(), a.status().name(), a.startsAt(), a.paidCents()));
    }

    @Override
    public boolean hasCompletedWith(UUID clientAccountId, UUID professionalId) { return queries.hasCompletedWith(clientAccountId, professionalId); }
}
