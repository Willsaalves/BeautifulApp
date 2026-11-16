package com.beautifulapp.story.internal;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.common.Ids;
import com.beautifulapp.media.MediaApi;
import com.beautifulapp.media.MediaKind;
import com.beautifulapp.moderation.ModerationApi;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.scheduling.SchedulingApi;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "story")
class Story {
    @Id UUID id;
    @Column(name = "author_account_id", nullable = false) UUID authorAccountId;
    @Column(name = "author_type", nullable = false) String authorType;
    @Column(name = "professional_id", nullable = false) UUID professionalId;
    @Column(name = "service_name") String serviceName;
    @Column(name = "image_key", nullable = false) String imageKey;
    String caption;
    @Column(name = "created_at", nullable = false) Instant createdAt;
    @Column(name = "expires_at", nullable = false) Instant expiresAt;
    @Column(name = "hidden_at") Instant hiddenAt;

    protected Story() {}
}

interface StoryRepository extends JpaRepository<Story, UUID> {
    @Query("select s from Story s where s.expiresAt > :now and s.hiddenAt is null order by s.createdAt desc")
    List<Story> active(Instant now, Pageable page);

    @Query("select s from Story s where s.professionalId = :pro and s.expiresAt > :now and s.hiddenAt is null order by s.createdAt")
    List<Story> activeOf(UUID pro, Instant now);

    @Modifying
    @Query("delete from Story s where s.expiresAt < :before")
    int purge(Instant before);
}

@Service
class StoryJobs {
    private final StoryRepository stories;
    private final Clock clock;

    StoryJobs(StoryRepository stories, Clock clock) {
        this.stories = stories;
        this.clock = clock;
    }

    /** Diariamente remove stories vencidos há mais de 7 dias (os arquivos no storage expiram por regra de ciclo de vida do bucket). */
    @Scheduled(cron = "0 30 4 * * *")
    @Transactional
    public int purgeOld() {
        return stories.purge(clock.instant().minus(Duration.ofDays(7)));
    }
}

@RestController
@Tag(name = "stories", description = "Stories de 24h")
class StoryController {
    static final Duration TTL = Duration.ofHours(24);

    private final StoryRepository stories;
    private final ProfileApi profiles;
    private final SchedulingApi scheduling;
    private final MediaApi media;
    private final Clock clock;
    private final ModerationApi moderation;

    StoryController(StoryRepository stories, ProfileApi profiles, SchedulingApi scheduling, MediaApi media, Clock clock, ModerationApi moderation) {
        this.moderation = moderation;
        this.stories = stories;
        this.profiles = profiles;
        this.scheduling = scheduling;
        this.media = media;
        this.clock = clock;
    }

    record StoryInput(@NotNull UUID professionalId, @NotBlank String imageKey, @Size(max = 200) String caption, @Size(max = 80) String serviceName) {}

    record StoryView(UUID id, String authorType, UUID authorAccountId, String authorName, String authorPhotoUrl, UUID professionalId,
                     String professionalStudio, String serviceName, String imageUrl, String caption, Instant createdAt, Instant expiresAt, boolean mine) {}

    @Operation(summary = "Postar story (cliente: só marcando profissional que já a atendeu; profissional: só a si mesma)")
    @PostMapping("/stories")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    StoryView post(@Valid @RequestBody StoryInput in) {
        UUID me = CurrentAccount.id();
        UUID myPro = profiles.accountOfProfessional(in.professionalId()).filter(me::equals).map(x -> in.professionalId()).orElse(null);
        String type;
        if (myPro != null) {
            type = "PROFESSIONAL";
        } else {
            if (profiles.publicProfessional(in.professionalId()).isEmpty()) throw ApiException.notFound("PROFESSIONAL_NOT_FOUND", "Profissional não encontrada.");
            if (!scheduling.hasCompletedWith(me, in.professionalId())) {
                throw ApiException.forbidden("NOT_ATTENDED", "Você só pode marcar profissionais que já te atenderam pelo app.");
            }
            type = "CLIENT";
        }
        String key = media.normalizeKey(in.imageKey());
        media.assertOwned(key, me, MediaKind.STORY);
        Story s = new Story();
        s.id = Ids.newId();
        s.authorAccountId = me;
        s.authorType = type;
        s.professionalId = in.professionalId();
        s.serviceName = StringUtils.hasText(in.serviceName()) ? in.serviceName().trim() : null;
        s.imageKey = key;
        s.caption = StringUtils.hasText(in.caption()) ? in.caption().trim() : null;
        s.createdAt = clock.instant();
        s.expiresAt = s.createdAt.plus(TTL);
        return view(stories.save(s), me);
    }

    @Operation(summary = "Stories ativos (últimas 24h), mais recentes primeiro; filtra por profissional se informado")
    @GetMapping("/stories")
    @Transactional(readOnly = true)
    List<StoryView> list(@RequestParam(required = false) UUID professionalId) {
        UUID me = CurrentAccount.id();
        Instant now = clock.instant();
        var list = professionalId != null ? stories.activeOf(professionalId, now) : stories.active(now, PageRequest.of(0, 100));
        Set<UUID> blocked = moderation.blockedWith(me);
        Map<UUID, UUID> proAccount = new HashMap<>();
        return list.stream()
                .filter(s -> blocked.isEmpty() || !blocked.contains(s.authorAccountId)
                        && !blocked.contains(proAccount.computeIfAbsent(s.professionalId, id -> profiles.accountOfProfessional(id).orElse(null))))
                .map(s -> view(s, me)).toList();
    }

    @Operation(summary = "Apagar meu story")
    @DeleteMapping("/stories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void delete(@PathVariable UUID id) {
        UUID me = CurrentAccount.id();
        stories.findById(id).filter(s -> s.authorAccountId.equals(me)).ifPresent(stories::delete);
    }

    private StoryView view(Story s, UUID me) {
        var pro = profiles.publicProfessional(s.professionalId).orElse(null);
        String authorName;
        String authorPhoto;
        if ("PROFESSIONAL".equals(s.authorType)) {
            authorName = pro == null ? "" : pro.studio();
            authorPhoto = pro == null ? null : pro.photoUrl();
        } else {
            var c = profiles.clientSummary(s.authorAccountId).orElse(null);
            authorName = c == null ? "Cliente" : c.name();
            authorPhoto = c == null ? null : c.photoUrl();
        }
        return new StoryView(s.id, s.authorType, s.authorAccountId, authorName, authorPhoto, s.professionalId,
                pro == null ? "" : pro.studio(), s.serviceName, media.publicUrl(s.imageKey), s.caption, s.createdAt, s.expiresAt,
                s.authorAccountId.equals(me));
    }
}
