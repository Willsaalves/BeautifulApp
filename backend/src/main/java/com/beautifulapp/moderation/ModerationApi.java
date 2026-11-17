package com.beautifulapp.moderation;

import java.util.Set;
import java.util.UUID;

public interface ModerationApi {
    /** Alguma das duas contas bloqueou a outra? */
    boolean blockedBetween(UUID a, UUID b);

    /** Contas que esta bloqueou ou que bloquearam esta (somem uma para a outra). */
    Set<UUID> blockedWith(UUID accountId);

    /** Fecha as denúncias abertas deste alvo. actioned=true: houve ação (conteúdo removido / conta suspensa). Devolve quantas. */
    int resolve(String targetType, UUID targetId, boolean actioned, UUID reviewerAccountId, String note);
}
