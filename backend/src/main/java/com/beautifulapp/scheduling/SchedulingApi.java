package com.beautifulapp.scheduling;

import java.util.List;
import java.util.UUID;

public interface SchedulingApi {
    List<WorkDay> workHours(UUID professionalId);
}
