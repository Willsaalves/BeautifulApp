package com.beautifulapp.profile;

import java.util.UUID;

/** Dados públicos da profissional (o que a cliente vê). */
public record PublicProfessional(UUID id, String name, String studio, String handle, Niche niche, String bio,
                                 String photoUrl, String coverUrl, String neighborhood, String city,
                                 Double latitude, Double longitude, String pixKey, int depositDeadlineHours) {}
