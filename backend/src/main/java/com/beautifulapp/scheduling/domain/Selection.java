package com.beautifulapp.scheduling.domain;

import java.util.UUID;

/** Escolha da cliente numa opção do serviço (ex: Formato → Stiletto, +R$ 15). Guarda os rótulos da época. */
public record Selection(UUID optionId, UUID choiceId, String optionLabel, String choiceLabel, long priceDeltaCents) {}
