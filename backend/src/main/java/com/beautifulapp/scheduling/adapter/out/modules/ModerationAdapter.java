package com.beautifulapp.scheduling.adapter.out.modules;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.beautifulapp.moderation.ModerationApi;
import com.beautifulapp.scheduling.application.port.out.BlockList;

/** Porta BlockList sobre o módulo moderation. */
@Component
class ModerationAdapter implements BlockList {
    private final ModerationApi moderation;

    ModerationAdapter(ModerationApi moderation) { this.moderation = moderation; }

    @Override
    public boolean blockedBetween(UUID a, UUID b) { return moderation.blockedBetween(a, b); }
}
