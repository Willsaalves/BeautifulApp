package com.beautifulapp.loyalty.internal;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.loyalty.VoucherView;
import com.beautifulapp.loyalty.internal.LoyaltyService.*;
import com.beautifulapp.profile.ProfileApi;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/me")
@Tag(name = "loyalty", description = "Cartão fidelidade e vouchers")
class LoyaltyController {
    private final LoyaltyService loyalty;
    private final ProfileApi profiles;

    LoyaltyController(LoyaltyService loyalty, ProfileApi profiles) {
        this.loyalty = loyalty;
        this.profiles = profiles;
    }

    @Operation(summary = "Meu programa de fidelidade (profissional)")
    @GetMapping("/loyalty-program")
    ProgramView program() { return loyalty.program(profiles.requireProfessionalId(CurrentAccount.id())); }

    @Operation(summary = "Configurar fidelidade: gastar X (centavos) → Y% OFF")
    @PutMapping("/loyalty-program")
    ProgramView save(@Valid @RequestBody ProgramInput body) {
        return loyalty.saveProgram(profiles.requireProfessionalId(CurrentAccount.id()), body);
    }

    @Operation(summary = "Meus cartões fidelidade (cliente)")
    @GetMapping("/loyalty")
    List<CardView> cards() { return loyalty.cards(CurrentAccount.id()); }

    @Operation(summary = "Meus vouchers (cliente)")
    @GetMapping("/vouchers")
    List<VoucherView> vouchers() { return loyalty.vouchers(CurrentAccount.id()); }
}
