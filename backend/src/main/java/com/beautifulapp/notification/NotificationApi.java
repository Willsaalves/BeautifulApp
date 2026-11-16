package com.beautifulapp.notification;

import java.util.UUID;

public interface NotificationApi {
    void notify(UUID accountId, String kind, String title, String body, UUID appointmentId);
}
