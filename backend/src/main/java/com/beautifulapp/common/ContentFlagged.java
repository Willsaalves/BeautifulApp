package com.beautifulapp.common;

import java.util.UUID;

/** Um conteúdo atingiu o limite de denúncias e deve sair do ar até a revisão (STORY ou REVIEW). */
public record ContentFlagged(String targetType, UUID targetId) {}
