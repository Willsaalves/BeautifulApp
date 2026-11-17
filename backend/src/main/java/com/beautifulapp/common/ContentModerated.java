package com.beautifulapp.common;

import java.util.UUID;

/**
 * Decisão da moderação sobre um conteúdo denunciado (STORY, REVIEW ou MESSAGE).
 * RESTORE: denúncia improcedente, volta ao ar. REMOVE: sai do ar de vez.
 */
public record ContentModerated(String targetType, UUID targetId, Decision decision) {
    public enum Decision { RESTORE, REMOVE }
}
