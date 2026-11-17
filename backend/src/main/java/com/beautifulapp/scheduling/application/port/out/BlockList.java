package com.beautifulapp.scheduling.application.port.out;

import java.util.UUID;

/** Bloqueios entre contas (implementado sobre o módulo moderation). */
public interface BlockList {
    boolean blockedBetween(UUID a, UUID b);
}
