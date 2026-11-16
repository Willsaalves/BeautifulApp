package com.beautifulapp.profile.internal;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.beautifulapp.identity.Role;
import com.beautifulapp.profile.Niche;

import jakarta.validation.constraints.*;

final class ProfileDtos {
    private ProfileDtos() {}

    record Me(UUID accountId, String phone, String email, Set<Role> roles, ClientDto client, ProfessionalDto professional, List<UUID> favorites) {}

    record ClientDto(String name, String handle, String bio, String photoKey, String photoUrl, String coverKey, String coverUrl) {}

    record ProfessionalDto(UUID id, String name, String studio, String handle, Niche niche, String bio,
                           String photoKey, String photoUrl, String coverKey, String coverUrl,
                           String neighborhood, String city, Double latitude, Double longitude, String pixKey, int depositDeadlineHours) {}

    record Onboarding(
            @NotNull Role role,
            @NotBlank @Size(min = 2, max = 80) String name,
            @Email String email,
            @Size(max = 160) String bio,
            String photoKey,
            String coverKey,
            @Size(max = 80) String studio,
            Niche niche,
            @Size(max = 80) String neighborhood,
            @Size(max = 80) String city,
            @Size(max = 140) String pixKey,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @NotNull(message = "É preciso aceitar os termos e a política de privacidade.")
            @AssertTrue(message = "É preciso aceitar os termos e a política de privacidade.") Boolean acceptedTerms,
            Boolean imageConsent) {}

    record ClientPatch(@Size(min = 2, max = 80) String name, @Size(max = 160) String bio, String photoKey, String coverKey, @Email String email) {}

    record ProfessionalPatch(@Size(min = 2, max = 80) String name, @Size(min = 2, max = 80) String studio, @Size(max = 160) String bio,
                             String photoKey, String coverKey, @Size(max = 80) String neighborhood, @Size(max = 80) String city,
                             @Size(max = 140) String pixKey, @Min(1) @Max(72) Integer depositDeadlineHours, @Email String email,
                             @DecimalMin("-90") @DecimalMax("90") Double latitude, @DecimalMin("-180") @DecimalMax("180") Double longitude) {}
}
