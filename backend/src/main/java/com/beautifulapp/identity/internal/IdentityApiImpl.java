package com.beautifulapp.identity.internal;

import java.time.Clock;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    IdentityApiImpl(AccountRepository accounts, ConsentRepository consents, Clock clock) {
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

    private Account load(UUID id) {
        return accounts.findById(id).orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Conta não encontrada."));
    }
}
