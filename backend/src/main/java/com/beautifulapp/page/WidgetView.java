package com.beautifulapp.page;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WidgetView(UUID id, WidgetType type, boolean fixed, String title, String subtitle, String color,
                         String imageKey, String imageUrl, List<String> images, List<String> imageUrls,
                         Integer value, Instant target, String body) {}
