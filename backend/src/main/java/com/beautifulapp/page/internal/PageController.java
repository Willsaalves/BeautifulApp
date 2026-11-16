package com.beautifulapp.page.internal;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.page.WidgetView;
import com.beautifulapp.page.internal.PageService.WidgetInput;
import com.beautifulapp.profile.ProfileApi;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/me/page/widgets")
@Tag(name = "page", description = "Página da profissional (blocos)")
class PageController {
    private final PageService page;
    private final ProfileApi profiles;

    PageController(PageService page, ProfileApi profiles) {
        this.page = page;
        this.profiles = profiles;
    }

    @Operation(summary = "Blocos da minha página (padrão se ainda não montou)")
    @GetMapping
    List<WidgetView> list() {
        return page.widgets(profiles.requireProfessionalId(CurrentAccount.id()));
    }

    @Operation(summary = "Salva a página inteira na ordem enviada (precisa ter SERVICOS e AGENDA)")
    @PutMapping
    List<WidgetView> replace(@NotNull @RequestBody List<@Valid WidgetInput> body) {
        var account = CurrentAccount.id();
        return page.replace(profiles.requireProfessionalId(account), account, body);
    }
}
