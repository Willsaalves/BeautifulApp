package com.beautifulapp.identity.internal;

import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.Ids;
import com.beautifulapp.common.Phones;
import com.beautifulapp.identity.Role;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/auth")
@Tag(name = "auth", description = "Login sem senha: celular + código")
class AuthController {
    private final OtpService otp;
    private final TokenService tokens;
    private final AccountRepository accounts;
    private final java.time.Clock clock;

    private final Set<String> adminPhones;

    AuthController(OtpService otp, TokenService tokens, AccountRepository accounts, java.time.Clock clock, com.beautifulapp.identity.IdentityProperties props) {
        this.adminPhones = props.adminPhones().stream().filter(s -> !s.isBlank()).map(Phones::normalize).collect(java.util.stream.Collectors.toUnmodifiableSet());
        this.otp = otp;
        this.tokens = tokens;
        this.accounts = accounts;
        this.clock = clock;
    }

    record OtpRequest(@NotBlank String phone) {}
    record OtpRequested(String phone, long expiresIn) {}
    record OtpVerify(@NotBlank String phone, @NotBlank @Pattern(regexp = "\\d{6}", message = "O código tem 6 dígitos.") String code) {}
    record Session(String accessToken, String refreshToken, long expiresIn, boolean isNew, Set<Role> roles) {}
    record RefreshRequest(@NotBlank String refreshToken) {}

    @Operation(summary = "Envia o código por SMS/WhatsApp")
    @PostMapping("/otp/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    OtpRequested request(@Valid @RequestBody OtpRequest body) {
        String phone = Phones.normalize(body.phone());
        return new OtpRequested(phone, otp.request(phone).toSeconds());
    }

    @Operation(summary = "Confere o código e abre a sessão. isNew=true quando a conta ainda não tem perfil (ir para o cadastro).")
    @PostMapping("/otp/verify")
    Session verify(@Valid @RequestBody OtpVerify body) {
        String phone = Phones.normalize(body.phone());
        otp.verify(phone, body.code()); // transação própria: tentativas erradas ficam gravadas
        Account account = accounts.findByPhone(phone)
                .orElseGet(() -> accounts.save(new Account(Ids.newId(), phone, clock.instant())));
        if (account.suspended()) {
            throw ApiException.forbidden("ACCOUNT_SUSPENDED", "Sua conta foi suspensa por descumprir os Termos de Uso. Fale com o suporte.");
        }
        account.syncAdmin(adminPhones.contains(phone));
        accounts.save(account);
        var t = tokens.issue(account);
        return new Session(t.accessToken(), t.refreshToken(), t.expiresIn(), account.isNew(), Set.copyOf(account.roles()));
    }

    @Operation(summary = "Renova a sessão (rotação do refresh token)")
    @PostMapping("/refresh")
    Session refresh(@Valid @RequestBody RefreshRequest body) {
        var t = tokens.refresh(body.refreshToken(), accounts);
        return new Session(t.accessToken(), t.refreshToken(), t.expiresIn(), false, Set.of());
    }

    @Operation(summary = "Encerra a sessão")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(@Valid @RequestBody RefreshRequest body) {
        tokens.revoke(body.refreshToken());
    }
}
