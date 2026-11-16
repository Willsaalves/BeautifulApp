package com.beautifulapp.media.internal;

import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.beautifulapp.common.AccountDeleted;
import com.beautifulapp.media.MediaKind;
import com.beautifulapp.media.MediaProperties;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Delete;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;

/**
 * Exclusão de conta: apaga do storage as fotos dela (perfil, capa, portfólio, stories, designs).
 * Comprovantes e referências ficam: fazem parte do registro do atendimento da outra parte.
 * Só depois do commit, para não apagar arquivos de uma exclusão que foi desfeita.
 */
@Component
class MediaDeletionListener {
    private static final Logger log = LoggerFactory.getLogger(MediaDeletionListener.class);
    private static final List<MediaKind> PERSONAL = List.of(MediaKind.AVATAR, MediaKind.COVER, MediaKind.PORTFOLIO, MediaKind.STORY, MediaKind.DESIGN);

    private final S3Client s3;
    private final MediaProperties props;

    MediaDeletionListener(S3Client s3, MediaProperties props) {
        this.s3 = s3;
        this.props = props;
    }

    @EventListener
    void on(AccountDeleted e) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() { purge(e.accountId()); }
            });
        } else {
            purge(e.accountId());
        }
    }

    void purge(UUID accountId) {
        for (MediaKind kind : PERSONAL) {
            String prefix = kind.prefix() + "/" + accountId + "/";
            try {
                for (var page : s3.listObjectsV2Paginator(r -> r.bucket(props.bucket()).prefix(prefix))) {
                    var ids = page.contents().stream().map(o -> ObjectIdentifier.builder().key(o.key()).build()).toList();
                    if (!ids.isEmpty()) s3.deleteObjects(r -> r.bucket(props.bucket()).delete(Delete.builder().objects(ids).quiet(true).build()));
                }
            } catch (RuntimeException ex) {
                // não derruba a exclusão: o arquivo órfão fica sem dono e sai na limpeza do bucket
                log.warn("Falha ao apagar {} do storage: {}", prefix, ex.getMessage());
            }
        }
    }
}
