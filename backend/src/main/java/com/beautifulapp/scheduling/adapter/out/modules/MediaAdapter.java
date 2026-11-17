package com.beautifulapp.scheduling.adapter.out.modules;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.beautifulapp.media.MediaApi;
import com.beautifulapp.media.MediaKind;
import com.beautifulapp.scheduling.application.port.out.Files;

/** Porta Files sobre o módulo media. */
@Component
class MediaAdapter implements Files {
    private final MediaApi media;

    MediaAdapter(MediaApi media) { this.media = media; }

    @Override
    public String ownedReference(UUID accountId, String keyOrUrl) { return owned(accountId, keyOrUrl, MediaKind.REFERENCE); }

    @Override
    public String ownedReceipt(UUID accountId, String keyOrUrl) { return owned(accountId, keyOrUrl, MediaKind.RECEIPT); }

    @Override
    public String readUrl(String key) { return media.signedReadUrl(key); }

    private String owned(UUID accountId, String keyOrUrl, MediaKind kind) {
        String key = media.normalizeKey(keyOrUrl);
        if (key != null) media.assertOwned(key, accountId, kind);
        return key;
    }
}
