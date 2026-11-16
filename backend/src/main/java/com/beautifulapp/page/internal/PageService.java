package com.beautifulapp.page.internal;

import java.time.Instant;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.Ids;
import com.beautifulapp.media.MediaApi;
import com.beautifulapp.media.MediaKind;
import com.beautifulapp.page.PageApi;
import com.beautifulapp.page.WidgetType;
import com.beautifulapp.page.WidgetView;
import com.beautifulapp.profile.ProfileApi;

import jakarta.validation.constraints.*;

@Service
class PageService implements PageApi {
    static final int MAX_WIDGETS = 30;
    private static final Set<MediaKind> IMAGE_KINDS = EnumSet.of(MediaKind.COVER, MediaKind.PORTFOLIO, MediaKind.DESIGN, MediaKind.STORY);

    private final PageWidgetRepository widgets;
    private final ProfileApi profiles;
    private final MediaApi media;

    PageService(PageWidgetRepository widgets, ProfileApi profiles, MediaApi media) {
        this.widgets = widgets;
        this.profiles = profiles;
        this.media = media;
    }

    record WidgetInput(
            UUID id,
            @NotNull WidgetType type,
            @Size(max = 80) String title,
            @Size(max = 160) String subtitle,
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$") String color,
            String imageKey,
            @Size(max = 24) List<String> images,
            @Min(0) @Max(100) Integer value,
            Instant target,
            @Size(max = 1000) String body) {}

    @Override
    @Transactional(readOnly = true)
    public List<WidgetView> widgets(UUID professionalId) {
        List<PageWidget> saved = widgets.findByProfessionalIdOrderByPosition(professionalId);
        if (!saved.isEmpty()) return saved.stream().map(this::view).toList();
        String studio = profiles.publicProfessional(professionalId).map(p -> p.studio()).orElse("");
        return defaults(professionalId, studio).stream().map(this::view).toList();
    }

    /** Substitui a página inteira (ordem + conteúdo). */
    @Transactional
    List<WidgetView> replace(UUID professionalId, UUID accountId, List<WidgetInput> input) {
        if (input.size() > MAX_WIDGETS) throw ApiException.badRequest("PAGE_TOO_MANY", "Máximo de %d blocos.".formatted(MAX_WIDGETS));
        for (WidgetType fixed : List.of(WidgetType.SERVICOS, WidgetType.AGENDA)) {
            long n = input.stream().filter(w -> w.type() == fixed).count();
            if (n != 1) throw ApiException.badRequest("PAGE_FIXED_REQUIRED", "A página precisa ter exatamente um bloco de %s.".formatted(fixed == WidgetType.SERVICOS ? "Serviços" : "Horários livres"));
        }
        widgets.deleteAllOf(professionalId);
        for (int i = 0; i < input.size(); i++) {
            WidgetInput in = input.get(i);
            PageWidget w = new PageWidget(in.id() != null ? in.id() : Ids.newId(), professionalId, in.type(), i);
            w.title = trim(in.title());
            w.subtitle = trim(in.subtitle());
            w.color = in.color();
            w.imageKey = ownedKey(in.imageKey(), accountId);
            w.images = in.images() == null ? new String[0]
                    : in.images().stream().map(k -> ownedKey(k, accountId)).filter(StringUtils::hasText).toArray(String[]::new);
            w.value = in.value();
            w.target = in.target();
            w.body = trim(in.body());
            widgets.save(w);
        }
        return widgets.findByProfessionalIdOrderByPosition(professionalId).stream().map(this::view).toList();
    }

    private String ownedKey(String keyOrUrl, UUID accountId) {
        String key = media.normalizeKey(keyOrUrl);
        if (!StringUtils.hasText(key)) return null;
        boolean ok = IMAGE_KINDS.stream().anyMatch(k -> key.startsWith(k.prefix() + "/" + accountId + "/"));
        if (!ok) throw ApiException.badRequest("MEDIA_NOT_OWNED", "Imagem inválida no bloco.");
        return key;
    }

    private List<PageWidget> defaults(UUID pro, String studio) {
        PageWidget capa = new PageWidget(Ids.newId(), pro, WidgetType.CAPA, 0);
        capa.title = studio;
        PageWidget servicos = new PageWidget(Ids.newId(), pro, WidgetType.SERVICOS, 1);
        servicos.title = "Serviços";
        PageWidget agenda = new PageWidget(Ids.newId(), pro, WidgetType.AGENDA, 2);
        agenda.title = "Próximos horários livres";
        PageWidget galeria = new PageWidget(Ids.newId(), pro, WidgetType.GALERIA, 3);
        galeria.title = "Portfólio";
        PageWidget avaliacoes = new PageWidget(Ids.newId(), pro, WidgetType.AVALIACOES, 4);
        avaliacoes.title = "Depoimentos";
        return List.of(capa, servicos, agenda, galeria, avaliacoes);
    }

    private WidgetView view(PageWidget w) {
        List<String> imgs = Arrays.asList(w.images == null ? new String[0] : w.images);
        return new WidgetView(w.id, w.type, w.type.fixed(), w.title, w.subtitle, w.color, w.imageKey, media.publicUrl(w.imageKey),
                imgs, imgs.stream().map(media::publicUrl).toList(), w.value, w.target, w.body);
    }

    private static String trim(String s) {
        return StringUtils.hasText(s) ? s.trim() : null;
    }
}
