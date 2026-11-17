package com.beautifulapp.identity.internal;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.beautifulapp.common.AccountDeleted;
import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.common.Ids;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Service
class AccountDeletionService {
    private static final Logger log = LoggerFactory.getLogger(AccountDeletionService.class);

    private final AccountRepository accounts;
    private final RefreshTokenRepository refreshTokens;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    AccountDeletionService(AccountRepository accounts, RefreshTokenRepository refreshTokens, ApplicationEventPublisher events, Clock clock) {
        this.accounts = accounts;
        this.refreshTokens = refreshTokens;
        this.events = events;
        this.clock = clock;
    }

    /** Tudo numa transação: os módulos limpam os dados deles ao receber AccountDeleted, e por último a conta é anonimizada. */
    @Transactional
    void delete(UUID accountId) {
        Account a = accounts.findById(accountId).filter(x -> !x.deleted())
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Conta não encontrada."));
        Instant now = clock.instant();
        events.publishEvent(new AccountDeleted(accountId, now, Ids.newId()));
        refreshTokens.revokeAll(accountId, now);
        a.markDeleted(now);
        log.info("Conta {} excluída a pedido da usuária", accountId);
    }
}

@RestController
@Tag(name = "auth", description = "Login sem senha: celular + código")
class AccountDeletionController {
    private final AccountDeletionService deletion;

    AccountDeletionController(AccountDeletionService deletion) { this.deletion = deletion; }

    @Operation(summary = "Excluir minha conta (apaga perfil, fotos, stories e favoritas; cancela agendamentos futuros)")
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete() {
        deletion.delete(CurrentAccount.id());
    }
}
