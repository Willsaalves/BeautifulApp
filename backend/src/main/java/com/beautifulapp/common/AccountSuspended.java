package com.beautifulapp.common;

import java.time.Instant;
import java.util.UUID;

/** Conta suspensa pela moderação: o conteúdo público dela sai do ar (stories) e ela some da busca. */
public record AccountSuspended(UUID accountId, Instant at, String reason) {}
