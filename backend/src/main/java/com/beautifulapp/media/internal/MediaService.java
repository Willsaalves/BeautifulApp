package com.beautifulapp.media.internal;

import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.Ids;
import com.beautifulapp.media.MediaApi;
import com.beautifulapp.media.MediaKind;
import com.beautifulapp.media.MediaProperties;

import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Service
class MediaService implements MediaApi {
    static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp", "image/heic", "heic");

    private final S3Presigner presigner;
    private final MediaProperties props;

    MediaService(S3Presigner presigner, MediaProperties props) {
        this.presigner = presigner;
        this.props = props;
    }

    record Upload(String key, String uploadUrl, String publicUrl, long expiresIn) {}

    Upload createUpload(UUID accountId, MediaKind kind, String contentType, long sizeBytes) {
        String ext = EXTENSIONS.get(contentType);
        if (ext == null) throw ApiException.badRequest("MEDIA_TYPE", "Envie uma imagem JPG, PNG, WEBP ou HEIC.");
        if (sizeBytes <= 0 || sizeBytes > props.maxBytes()) {
            throw ApiException.badRequest("MEDIA_SIZE", "A imagem deve ter até %d MB.".formatted(props.maxBytes() / 1_048_576));
        }
        String key = "%s/%s/%s.%s".formatted(kind.prefix(), accountId, Ids.newId(), ext);
        PutObjectRequest put = PutObjectRequest.builder()
                .bucket(props.bucket())
                .key(key)
                .contentType(contentType)
                .contentLength(sizeBytes)
                .build();
        var presigned = presigner.presignPutObject(r -> r.signatureDuration(props.uploadUrlTtl()).putObjectRequest(put));
        return new Upload(key, presigned.url().toString(), kind.publicRead() ? publicUrl(key) : null, props.uploadUrlTtl().toSeconds());
    }

    @Override
    public String publicUrl(String key) {
        if (!StringUtils.hasText(key)) return null;
        return props.publicBaseUrl().replaceAll("/$", "") + "/" + key;
    }

    @Override
    public void assertOwned(String key, UUID accountId, MediaKind kind) {
        if (key == null) return;
        if (!key.startsWith(kind.prefix() + "/" + accountId + "/")) {
            throw ApiException.badRequest("MEDIA_NOT_OWNED", "Arquivo inválido para este campo.");
        }
    }
}
