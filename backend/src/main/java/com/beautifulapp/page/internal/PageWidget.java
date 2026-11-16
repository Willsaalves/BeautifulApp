package com.beautifulapp.page.internal;

import java.time.Instant;
import java.util.UUID;

import com.beautifulapp.page.WidgetType;

import jakarta.persistence.*;

@Entity
@Table(name = "page_widget")
class PageWidget {
    @Id UUID id;
    @Column(name = "professional_id", nullable = false) UUID professionalId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) WidgetType type;
    @Column(nullable = false) int position;
    String title;
    String subtitle;
    String color;
    @Column(name = "image_key") String imageKey;
    @Column(columnDefinition = "text[]", nullable = false) String[] images = new String[0];
    Integer value;
    Instant target;
    String body;

    protected PageWidget() {}

    PageWidget(UUID id, UUID professionalId, WidgetType type, int position) {
        this.id = id;
        this.professionalId = professionalId;
        this.type = type;
        this.position = position;
    }
}
