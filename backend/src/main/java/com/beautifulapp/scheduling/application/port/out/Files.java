package com.beautifulapp.scheduling.application.port.out;

import java.util.UUID;

/** Arquivos enviados pelo app (implementado sobre o módulo media). */
public interface Files {
    /** Chave da foto de referência, garantindo que foi enviada por esta conta. Null se não informada. */
    String ownedReference(UUID accountId, String keyOrUrl);

    /** Chave do comprovante, garantindo que foi enviado por esta conta. */
    String ownedReceipt(UUID accountId, String keyOrUrl);

    /** Link temporário para ler um arquivo privado. */
    String readUrl(String key);
}
