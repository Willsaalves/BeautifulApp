package com.beautifulapp.profile.internal;

import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.profile.internal.ProfileDtos.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/me")
@Tag(name = "me", description = "Conta e perfis da pessoa logada")
class MeController {
    private final ProfileService profiles;

    MeController(ProfileService profiles) { this.profiles = profiles; }

    @Operation(summary = "Conta, papéis e perfis (cliente e/ou profissional)")
    @GetMapping
    Me me() {
        return profiles.me(CurrentAccount.id());
    }

    @Operation(summary = "Cadastro: cria o perfil de cliente ou de profissional e registra os consentimentos")
    @PostMapping("/onboarding")
    Me onboarding(@Valid @RequestBody Onboarding body) {
        return profiles.onboard(CurrentAccount.id(), body);
    }

    @Operation(summary = "Edita o perfil de cliente (nome, bio, foto, capa)")
    @PatchMapping("/client-profile")
    Me patchClient(@Valid @RequestBody ClientPatch body) {
        return profiles.patchClient(CurrentAccount.id(), body);
    }

    @Operation(summary = "Edita o perfil de profissional")
    @PatchMapping("/professional")
    Me patchProfessional(@Valid @RequestBody ProfessionalPatch body) {
        return profiles.patchProfessional(CurrentAccount.id(), body);
    }
}
