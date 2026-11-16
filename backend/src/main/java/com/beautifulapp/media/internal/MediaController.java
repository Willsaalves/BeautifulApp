package com.beautifulapp.media.internal;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.media.MediaKind;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@RestController
@RequestMapping("/media")
@Tag(name = "media")
class MediaController {
    private final MediaService media;

    MediaController(MediaService media) { this.media = media; }

    record UploadRequest(@NotNull MediaKind kind, @NotBlank String contentType, @Positive long sizeBytes) {}

    @Operation(summary = "Gera URL pré-assinada (PUT) para o app enviar a imagem direto ao storage")
    @PostMapping("/upload-url")
    MediaService.Upload uploadUrl(@Valid @RequestBody UploadRequest body) {
        return media.createUpload(CurrentAccount.id(), body.kind(), body.contentType(), body.sizeBytes());
    }
}
