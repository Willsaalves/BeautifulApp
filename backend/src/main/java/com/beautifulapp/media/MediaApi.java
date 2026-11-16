package com.beautifulapp.media;

import java.util.UUID;

public interface MediaApi {
    /** URL pública (CDN) de um arquivo público; null para chave vazia. */
    String publicUrl(String key);

    /** Garante que a chave foi gerada para esta conta e este tipo (evita usar foto de outra pessoa). */
    void assertOwned(String key, UUID accountId, MediaKind kind);
}
