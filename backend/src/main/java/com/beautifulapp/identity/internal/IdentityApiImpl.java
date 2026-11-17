package com.beautifulapp.identity.internal;

import java.time.Clock;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.common.AccountSuspended;
import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.Ids;
import com.beautifulapp.identity.AccountView;
import com.beautifulapp.identity.IdentityApi;
import com.beautifulapp.identity.Role;

@Service
class IdentityApiImpl implements IdentityApi {
    private final AccountRepository accounts;
    private final ConsentRepository consents;
    private final Clock clock;

    private final RefreshTokenRepository refreshTokens;
    private final org.springframework.context.ApplicationEventPublisher events;
    private final AccountDeletionService deletion;

    IdentityApiImpl(AccountRepository accounts, ConsentRepository consents, Clock clock, RefreshTokenRepository refreshTokens,
                    org.springframework.context.ApplicationEventPublisher events, AccountDeletionService deletion) {
        this.refreshTokens = refreshTokens;
        this.events = events;
        this.deletion = deletion;
        this.accounts = accounts;
        this.consents = consents;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AccountView> find(UUID accountId) {
        return accounts.findById(accountId).map(Account::view);
    }

    @Override
    @Transactional
    public void grantRole(UUID accountId, Role role) {
        load(accountId).grant(role);
    }

    @Override
    @Transactional
    public void updateEmail(UUID accountId, String email) {
        load(accountId).email(email);
    }

    @Override
    @Transactional
    public void recordConsent(UUID accountId, String kind, String version) {
        consents.save(new Consent(Ids.newId(), accountId, kind, version, clock.instant()));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasConsent(UUID accountId, String kind, String versionOrNull) {
        return consents.history(accountId, kind).stream().findFirst()
                .filter(Consent::active)
                .filter(c -> versionOrNull == null || versionOrNull.equals(c.version()))
                .isPresent();
    }

    @Override
    @Transactional
    public void revokeConsent(UUID accountId, String kind) {
        consents.history(accountId, kind).forEach(c -> c.revoke(clock.instant()));
    }

    @Override
    @Transactional
    public void suspend(UUID accountId, String reason) {
        Account a = load(accountId);
        if (a.deleted()) throw ApiException.conflict("ACCOUNT_DELETED", "Essa conta já foi excluída.");
        if (a.suspended()) return;
        a.suspend(reason, clock.instant());
        refreshTokens.revokeAll(accountId, clock.instant());
        events.publishEvent(new AccountSuspended(accountId, clock.instant(), reason));
    }

    @Override
    @Transactional
    public void reactivate(UUID accountId) {
        load(accountId).reactivate();
    }

    @Override
    public void delete(UUID accountId) {
        deletion.delete(accountId);
    }

    private Account load(UUID id) {
        return accounts.findById(id).orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Conta não encontrada."));
    }
}
