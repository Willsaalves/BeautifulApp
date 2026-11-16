package com.beautifulapp.review;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ReviewApi {
    record ReviewView(UUID id, UUID appointmentId, String clientName, String clientPhotoUrl, int rating, String comment, Instant createdAt) {}

    record Summary(double average, int count) {}

    List<ReviewView> recent(UUID professionalId, int limit);

    Summary summary(UUID professionalId);
}
