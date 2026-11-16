package com.beautifulapp.common;

import java.time.Instant;
import java.util.UUID;

/**
 * A conta pediu exclusão (LGPD / exigência das lojas). Publicado dentro da transação do DELETE /me:
 * cada módulo apaga ou anonimiza o que é dele, e tudo é desfeito junto se algo falhar.
 * Registros que outras pessoas precisam (atendimentos já feitos, avaliações, comprovantes) ficam, mas sem dados pessoais.
 */
public record AccountDeleted(UUID accountId, Instant at) {}
