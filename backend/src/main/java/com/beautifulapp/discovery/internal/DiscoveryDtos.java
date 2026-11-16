package com.beautifulapp.discovery.internal;

import java.util.List;
import java.util.UUID;

import com.beautifulapp.catalog.CatalogViews.DesignView;
import com.beautifulapp.catalog.CatalogViews.ServiceView;
import com.beautifulapp.page.WidgetView;
import com.beautifulapp.profile.Niche;
import com.beautifulapp.profile.PublicProfessional;
import com.beautifulapp.review.ReviewApi;
import com.beautifulapp.scheduling.WorkDay;

final class DiscoveryDtos {
    private DiscoveryDtos() {}

    record ProfessionalCard(UUID id, String name, String studio, String handle, Niche niche, String bio,
                            String photoUrl, String coverUrl, String neighborhood, String city,
                            Double distanceKm, Long minPriceCents, int servicesCount, Double rating, int reviews) {}

    record PublicPage(PublicProfessional professional, List<ServiceView> services, List<DesignView> designs, List<WidgetView> widgets,
                      List<WorkDay> workHours, ReviewApi.Summary rating, List<ReviewApi.ReviewView> reviews) {}

    record TrendingDesign(UUID id, UUID professionalId, String studio, String professionalPhotoUrl, UUID serviceId,
                          String serviceName, String name, String imageUrl, long priceDeltaCents, Double distanceKm) {}
}
