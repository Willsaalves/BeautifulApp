package com.beautifulapp.catalog.internal;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.catalog.CatalogViews.DesignView;
import com.beautifulapp.catalog.CatalogViews.ServiceView;
import com.beautifulapp.catalog.internal.CatalogDtos.DesignInput;
import com.beautifulapp.catalog.internal.CatalogDtos.ServiceInput;
import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.profile.ProfileApi;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/me")
@Tag(name = "catalog", description = "Serviços e Trending Designs da profissional logada")
class CatalogController {
    private final CatalogService catalog;
    private final ProfileApi profiles;

    CatalogController(CatalogService catalog, ProfileApi profiles) {
        this.catalog = catalog;
        this.profiles = profiles;
    }

    private UUID pro() { return profiles.requireProfessionalId(CurrentAccount.id()); }

    @Operation(summary = "Meus serviços ativos")
    @GetMapping("/services")
    List<ServiceView> services() { return catalog.activeServices(pro()); }

    @Operation(summary = "Criar serviço")
    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    ServiceView create(@Valid @RequestBody ServiceInput body) { return catalog.create(pro(), body); }

    @Operation(summary = "Editar serviço (opções/escolhas com id mantêm o id)")
    @PutMapping("/services/{id}")
    ServiceView update(@PathVariable UUID id, @Valid @RequestBody ServiceInput body) { return catalog.update(pro(), id, body); }

    @Operation(summary = "Desativar serviço")
    @DeleteMapping("/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) { catalog.deactivate(pro(), id); }

    @Operation(summary = "Meus Trending Designs")
    @GetMapping("/designs")
    List<DesignView> designs() { return catalog.myDesigns(pro()); }

    @Operation(summary = "Criar design (imageKey de upload kind=DESIGN)")
    @PostMapping("/designs")
    @ResponseStatus(HttpStatus.CREATED)
    DesignView createDesign(@Valid @RequestBody DesignInput body) {
        return catalog.createDesign(pro(), CurrentAccount.id(), body);
    }

    @Operation(summary = "Editar design")
    @PutMapping("/designs/{id}")
    DesignView updateDesign(@PathVariable UUID id, @Valid @RequestBody DesignInput body) {
        return catalog.updateDesign(pro(), CurrentAccount.id(), id, body);
    }

    @Operation(summary = "Apagar design")
    @DeleteMapping("/designs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteDesign(@PathVariable UUID id) { catalog.deleteDesign(pro(), id); }
}
