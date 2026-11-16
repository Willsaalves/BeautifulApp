package com.beautifulapp.media;

import java.util.UUID;

public interface MediaApi {
    /** URL pública (CDN) de um arquivo público; null para chave vazia. */
    String publicUrl(String key);

    /** Garante que a chave foi gerada para esta conta e este tipo (evita usar foto de outra pessoa). */
    void assertOwned(String key, UUID accountId, MediaKind kind);

    /** Link temporário (5 min) para ler um arquivo privado, ex: comprovante. */
    String signedReadUrl(String key);

    /** Aceita a chave ou a URL pública e devolve a chave (o app guarda URLs, a API guarda chaves). */
    String normalizeKey(String keyOrUrl);
}
